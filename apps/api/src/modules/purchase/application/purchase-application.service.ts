import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { normalizeAttachments } from '../../../common/storage/attachment-items';
import { DocumentNumberService } from '../../../common/workflow/application/document-number.service';
import { AttachmentService } from '../../attachments/application/attachment.service';
import { DocumentWorkflowService } from '../../../common/workflow/application/document-workflow.service';
import { PurchaseEntity } from '../infrastructure/purchase.entity';
import { PurchaseItemEntity } from '../infrastructure/purchase-item.entity';
import type { PurchaseApprovalDto, PurchaseDto } from '../presentation/purchase.dto';

@Injectable()
export class PurchaseApplicationService {
  constructor(
    @InjectRepository(PurchaseEntity)
    private readonly purchases: Repository<PurchaseEntity>,
    @InjectRepository(PurchaseItemEntity)
    private readonly items: Repository<PurchaseItemEntity>,
    @Inject(DocumentWorkflowService)
    private readonly workflow: DocumentWorkflowService,
    @Inject(DocumentNumberService)
    private readonly documentNumbers: DocumentNumberService,
    @Inject(DataSource)
    private readonly dataSource: DataSource,
    @Inject(AttachmentService)
    private readonly attachments: AttachmentService,
  ) {}

  async save(dto: PurchaseDto, user: SessionUser, id?: string) {
    const normalized = normalizePurchase(dto);
    if (id) {
      await this.workflow.getEditable(id, user);
      const current = await this.purchases.findOneBy({ id });
      if (!current) {
        throw new NotFoundException('采购审批单不存在');
      }
      const saved = await this.purchases.save({ ...current, ...normalized });
      await this.replaceItems(id, normalized.items);
      await this.workflow.updateDraftTitle(id, dto.name, user);
      return this.withIndex(saved, user);
    }
    const documentId = randomUUID();
    // 采购单号与请示一致：部门简称 + 日期 + 序号，例如 GCB20261011-001
    const number = await this.documentNumbers.generateForDepartment(
      this.dataSource.manager,
      user.departmentName,
    );
    const saved = await this.purchases.save({
      id: documentId,
      number,
      applicantId: user.id,
      departmentId: user.departmentId,
      ...normalized,
    });
    await this.replaceItems(documentId, normalized.items);
    await this.workflow.registerDraft({
      id: documentId,
      documentType: 'PURCHASE_APPROVAL',
      module: 'PURCHASE',
      title: dto.name,
      applicantId: user.id,
      departmentId: user.departmentId,
      documentNo: number,
    });
    return this.withIndex(saved, user);
  }

  async get(id: string, user: SessionUser) {
    await this.workflow.getViewableDocument(id, user);
    const entity = await this.purchases.findOneBy({ id });
    if (!entity) {
      throw new NotFoundException('采购审批单不存在');
    }
    return this.withIndex(entity, user);
  }

  /** 采购经办在审批节点上传附件（普通附件上传接口要求 DOCUMENT_CREATE，审批人没有该权限）。 */
  async uploadApprovalAttachment(
    id: string,
    file: { fileName: string; content: Buffer },
    user: SessionUser,
  ) {
    const task = await this.workflow.getModeratableTask(id, user);
    if (task.assigneeRole !== 'PROCUREMENT') {
      throw new ForbiddenException('只有采购经办可以补充附件');
    }
    return this.attachments.upload(file, user);
  }

  /** 采购经办在当前审批节点补充单价和附件。 */
  async updateApproval(id: string, dto: PurchaseApprovalDto, user: SessionUser) {
    const task = await this.workflow.getModeratableTask(id, user);
    if (task.assigneeRole !== 'PROCUREMENT') {
      throw new ForbiddenException('只有采购经办可以补充价格与附件');
    }
    const entity = await this.purchases.findOneBy({ id });
    if (!entity) {
      throw new NotFoundException('采购审批单不存在');
    }
    await this.purchases.update({ id }, { attachments: normalizeAttachments(dto.attachments) });
    await this.replaceItems(id, dto.items);
    return this.withIndex(await this.purchases.findOneByOrFail({ id }), user);
  }

  /** 明细整体替换，并按「明细小计 + 关税 + 增值税 + 其它费用」重算总价。 */
  private async replaceItems(purchaseId: string, drafts: PurchaseDto['items']): Promise<void> {
    if (!drafts) return;
    await this.items.delete({ purchaseId });
    if (drafts.length > 0) {
      await this.items.save(
        drafts.map((draft) => ({
          id: randomUUID(),
          purchaseId,
          name: draft.name,
          specification: draft.specification ?? '',
          unit: draft.unit ?? '',
          quantity: draft.quantity,
          unitPriceCents: draft.unitPriceCents,
          subtotalCents: draft.unitPriceCents * draft.quantity,
        })),
      );
    }
    await this.recalculateTotal(purchaseId);
  }

  private async recalculateTotal(purchaseId: string): Promise<void> {
    const [entity, items] = await Promise.all([
      this.purchases.findOneBy({ id: purchaseId }),
      this.items.findBy({ purchaseId }),
    ]);
    if (!entity) return;
    const subtotalCents = items.reduce((sum, item) => sum + item.subtotalCents, 0);
    await this.purchases.update(
      { id: purchaseId },
      {
        subtotalCents,
        amountCents: subtotalCents + entity.tariffCents + entity.vatCents + entity.otherFeesCents,
      },
    );
  }

  private async withIndex(entity: PurchaseEntity, user: SessionUser) {
    const canModerate = await this.workflow
      .getModeratableTask(entity.id, user)
      .then((task) => task.assigneeRole === 'PROCUREMENT')
      .catch(() => false);
    return {
      // 明细单独存表，响应里带上一并返回，编辑与打印才能回显
      data: { ...entity, items: await this.items.findBy({ purchaseId: entity.id }), canModerate },
      document: await this.workflow.getDocument(entity.id),
      opinions: await this.workflow.readOpinions(entity.id),
    };
  }
}

/** 线下《采购申请单》新增字段的默认值，兼容旧前端载荷。 */
function normalizePurchase(dto: PurchaseDto) {
  return {
    itemCategory: 'NON_STOCK',
    budgetType: 'NONE',
    tariffCents: 0,
    vatCents: 0,
    otherFeesCents: 0,
    reason: '',
    handlerName: '',
    supplierA: '',
    supplierB: '',
    supplierC: '',
    requiredDate: null,
    purchaseOrderNo: '',
    ...dto,
    // 金额与乙方信息已从表单取消，旧载荷仍可传值，缺省时用空值兜底
    amountCents: dto.amountCents ?? 0,
    counterpartyName: dto.counterpartyName ?? '',
    counterpartyContact: dto.counterpartyContact ?? null,
    counterpartyPhone: dto.counterpartyPhone ?? null,
    paymentMethod: dto.paymentMethod ?? null,
    attachments: normalizeAttachments(dto.attachments),
  };
}
