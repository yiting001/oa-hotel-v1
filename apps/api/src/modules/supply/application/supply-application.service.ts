import { Inject, Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { randomUUID } from 'node:crypto';
import { createDocumentNumber } from '../../../common/domain/document-number';
import { Quantity } from '../../../common/domain/quantity';
import { DomainError } from '../../../common/errors/domain-error';
import { DocumentWorkflowService } from '../../../common/workflow/application/document-workflow.service';
import { calculatePurchaseTotals } from '../domain/material-purchase';
import { SUPPLY_REPOSITORY, type SupplyRepository } from '../domain/supply.repository';
import type { RequisitionItem } from '../domain/supply-types';
import type {
  IssueRequisitionDto,
  MaterialPurchaseDto,
  MaterialRequisitionDto,
} from '../presentation/supply.dto';

@Injectable()
export class SupplyApplicationService implements OnApplicationBootstrap {
  constructor(
    @Inject(SUPPLY_REPOSITORY)
    private readonly repository: SupplyRepository,
    @Inject(DocumentWorkflowService)
    private readonly workflow: DocumentWorkflowService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NODE_ENV === 'production' || (await this.repository.countItems()) > 0) {
      return;
    }
    await this.repository.saveItems([
      {
        id: 'item-paper',
        code: 'OFFICE-A4',
        name: 'A4 复印纸',
        specification: '80g 500张/包',
        unit: '包',
        availableQuantity: '120',
        active: true,
      },
      {
        id: 'item-pen',
        code: 'OFFICE-PEN',
        name: '中性笔',
        specification: '0.5mm 黑色',
        unit: '支',
        availableQuantity: '300',
        active: true,
      },
    ]);
  }

  listItems() {
    return this.repository.listItems();
  }

  async savePurchase(dto: MaterialPurchaseDto, user: SessionUser, id?: string) {
    const totals = calculatePurchaseTotals(dto.items);
    const fields = {
      applicationDate: dto.applicationDate,
      items: dto.items,
      ...totals,
    };
    if (id) {
      await this.workflow.getEditable(id, user);
      const current = await this.repository.findPurchase(id);
      if (!current) {
        throw new NotFoundException('物资申购单不存在');
      }
      return this.withIndex(await this.repository.savePurchase({ ...current, ...fields }));
    }
    const documentId = randomUUID();
    const saved = await this.repository.savePurchase({
      id: documentId,
      number: createDocumentNumber('MATERIAL-PURCHASE', documentId),
      applicantId: user.id,
      departmentId: user.departmentId,
      ...fields,
    });
    await this.workflow.registerDraft({
      id: documentId,
      documentType: 'MATERIAL_PURCHASE',
      module: 'SUPPLY',
      title: `物资申购：${dto.items[0].name}等${dto.items.length}项`,
      applicantId: user.id,
      departmentId: user.departmentId,
    });
    return this.withIndex(saved);
  }

  async saveRequisition(dto: MaterialRequisitionDto, user: SessionUser, id?: string) {
    const items = await this.buildRequisitionItems(dto);
    if (id) {
      await this.workflow.getEditable(id, user);
      const current = await this.repository.findRequisition(id);
      if (!current) {
        throw new NotFoundException('领用申请单不存在');
      }
      return this.withIndex(
        await this.repository.saveRequisition({
          ...current,
          applicationDate: dto.applicationDate,
          contactUserId: dto.contactUserId,
          items,
          attachments: dto.attachments,
        }),
      );
    }
    const documentId = randomUUID();
    const saved = await this.repository.saveRequisition({
      id: documentId,
      number: createDocumentNumber('MATERIAL-REQUISITION', documentId),
      applicantId: user.id,
      departmentId: user.departmentId,
      contactUserId: dto.contactUserId,
      applicationDate: dto.applicationDate,
      items,
      attachments: dto.attachments,
      issueStatus: 'NOT_ISSUED',
      issuedAt: null,
      issuedBy: null,
    });
    await this.workflow.registerDraft({
      id: documentId,
      documentType: 'MATERIAL_REQUISITION',
      module: 'SUPPLY',
      title: `物资领用：${items[0].name}等${items.length}项`,
      applicantId: user.id,
      departmentId: user.departmentId,
    });
    return this.withIndex(saved);
  }

  async issue(id: string, dto: IssueRequisitionDto, user: SessionUser) {
    if (!user.roleCodes.includes('WAREHOUSE_MANAGER')) {
      throw new DomainError('WAREHOUSE_MANAGER_REQUIRED', '只有仓库管理员可以登记实发');
    }
    const requisition = await this.repository.findRequisition(id);
    if (!requisition) {
      throw new NotFoundException('领用申请单不存在');
    }
    const document = await this.workflow.getDocument(id);
    if (document.status !== 'APPROVED') {
      throw new DomainError('DOCUMENT_NOT_APPROVED', '审批完成后才能发放物资');
    }
    if (requisition.issueStatus !== 'NOT_ISSUED') {
      throw new DomainError('REQUISITION_ALREADY_ISSUED', '该领用单已完成发放登记');
    }
    const issuedMap = new Map(dto.items.map((item) => [item.materialItemId, item.issuedQuantity]));
    const issuedItems = requisition.items.map((item) => {
      const issuedQuantity = issuedMap.get(item.materialItemId);
      if (issuedQuantity === undefined) {
        throw new DomainError('ISSUED_ITEM_MISSING', `缺少 ${item.name} 的实发数量`);
      }
      const issued = Quantity.parse(issuedQuantity, true);
      const requested = Quantity.parse(item.requestedQuantity);
      if (issued.scaled > requested.scaled) {
        throw new DomainError('ISSUED_QUANTITY_EXCEEDED', '实发数量不能超过请领数量');
      }
      return { ...item, issuedQuantity: issued.toString() };
    });
    return this.withIndex(
      await this.repository.issueItems(requisition, issuedItems, user.id, dto.issuedAt),
    );
  }

  async getPurchase(id: string) {
    const entity = await this.repository.findPurchase(id);
    if (!entity) {
      throw new NotFoundException('物资申购单不存在');
    }
    return this.withIndex(entity);
  }

  async getRequisition(id: string) {
    const entity = await this.repository.findRequisition(id);
    if (!entity) {
      throw new NotFoundException('领用申请单不存在');
    }
    return this.withIndex(entity);
  }

  private async buildRequisitionItems(dto: MaterialRequisitionDto): Promise<RequisitionItem[]> {
    const uniqueIds = [...new Set(dto.items.map((item) => item.materialItemId))];
    const materials = await this.repository.findItems(uniqueIds);
    if (materials.length !== uniqueIds.length) {
      throw new DomainError('MATERIAL_ITEM_NOT_FOUND', '选择的物资不存在');
    }
    const materialMap = new Map(materials.map((item) => [item.id, item]));
    return dto.items.map((input) => {
      Quantity.parse(input.requestedQuantity);
      const material = materialMap.get(input.materialItemId);
      if (!material) {
        throw new DomainError('MATERIAL_ITEM_NOT_FOUND', '选择的物资不存在');
      }
      return {
        materialItemId: material.id,
        itemCode: material.code,
        name: material.name,
        specification: material.specification,
        unit: material.unit,
        requestedQuantity: input.requestedQuantity,
        issuedQuantity: null,
        purpose: input.purpose,
      };
    });
  }

  private async withIndex<T extends { id: string }>(entity: T) {
    return {
      data: entity,
      document: await this.workflow.getDocument(entity.id),
      opinions: await this.workflow.history(entity.id),
    };
  }
}
