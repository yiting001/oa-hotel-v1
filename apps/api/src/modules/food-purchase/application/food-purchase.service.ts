import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { DocumentAttachmentItem, SessionUser } from '@oa/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { normalizeAttachments } from '../../../common/storage/attachment-items';
import { businessDateIso } from '../../../common/time/business-date';
import { DocumentNumberService } from '../../../common/workflow/application/document-number.service';
import { DocumentWorkflowService } from '../../../common/workflow/application/document-workflow.service';
import { FoodPurchaseChangeLogEntity } from '../infrastructure/food-purchase-change-log.entity';
import { FoodPurchaseItemEntity } from '../infrastructure/food-purchase-item.entity';
import { FoodPurchaseEntity } from '../infrastructure/food-purchase.entity';
import type { FoodPurchaseDto, FoodPurchaseItemDto } from '../presentation/food-purchase.dto';

interface NormalizedItem {
  category: string;
  name: string;
  specification: string;
  unit: string;
  quantity: number;
  requirement: string;
  unitPriceCents: number | null;
  subtotalCents: number;
  remark: string;
}

@Injectable()
export class FoodPurchaseService {
  constructor(
    @InjectRepository(FoodPurchaseEntity)
    private readonly purchases: Repository<FoodPurchaseEntity>,
    @InjectRepository(FoodPurchaseItemEntity)
    private readonly items: Repository<FoodPurchaseItemEntity>,
    @InjectRepository(FoodPurchaseChangeLogEntity)
    private readonly changeLogs: Repository<FoodPurchaseChangeLogEntity>,
    @Inject(DocumentWorkflowService)
    private readonly workflow: DocumentWorkflowService,
    @Inject(DocumentNumberService)
    private readonly documentNumbers: DocumentNumberService,
    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {}

  async save(dto: FoodPurchaseDto, user: SessionUser, id?: string) {
    const items = normalizeItems(dto.items);
    const attachments: DocumentAttachmentItem[] = normalizeAttachments(dto.attachments);
    if (id) {
      await this.workflow.getEditable(id, user);
      const current = await this.purchases.findOneBy({ id });
      if (!current) {
        throw new NotFoundException('食材采购单不存在');
      }
      const saved = await this.purchases.save({
        ...current,
        applicationDate: dto.applicationDate ?? current.applicationDate,
        teamName: dto.teamName?.trim() ?? current.teamName,
        attachments,
      });
      await this.replaceItems(id, items);
      await this.workflow.updateDraftTitle(id, titleFor(items), user);
      return this.envelope((await this.purchases.findOneByOrFail({ id: saved.id }))!, user);
    }

    const documentId = randomUUID();
    // 食材采购单号与其它单据一致：部门简称 + 日期 + 序号，例如 GCB20261028-001
    const number = await this.documentNumbers.generateForDepartment(
      this.dataSource.manager,
      user.departmentName,
    );
    await this.purchases.save({
      id: documentId,
      number,
      applicantId: user.id,
      departmentId: user.departmentId,
      applicationDate: dto.applicationDate ?? businessDateIso(),
      teamName: dto.teamName?.trim() ?? '',
      totalAmountCents: 0,
      attachments,
    });
    await this.replaceItems(documentId, items);
    await this.workflow.registerDraft({
      id: documentId,
      documentType: 'FOOD_PURCHASE',
      module: 'FOOD_PURCHASE',
      title: titleFor(items),
      applicantId: user.id,
      departmentId: user.departmentId,
      documentNo: number,
    });
    return this.envelope(await this.purchases.findOneByOrFail({ id: documentId }), user);
  }

  async get(id: string, user: SessionUser) {
    await this.workflow.getViewableDocument(id, user);
    const entity = await this.purchases.findOneBy({ id });
    if (!entity) {
      throw new NotFoundException('食材采购单不存在');
    }
    return this.envelope(entity, user);
  }

  /** 审批领导删减/修改明细：仅当前待办办理人可操作，并记录变更日志。 */
  async replaceItemsAsApprover(
    id: string,
    dto: { items: FoodPurchaseItemDto[] },
    user: SessionUser,
  ) {
    await this.workflow.getModeratableDocument(id, user);
    const entity = await this.purchases.findOneBy({ id });
    if (!entity) {
      throw new NotFoundException('食材采购单不存在');
    }
    const before = await this.items.find({
      where: { purchaseId: id },
      order: { sortOrder: 'ASC' },
    });
    const items = normalizeItems(dto.items);
    await this.replaceItems(id, items);
    const beforeTotal = before.reduce((sum, item) => sum + item.subtotalCents, 0);
    const afterTotal = items.reduce((sum, item) => sum + item.subtotalCents, 0);
    await this.changeLogs.save({
      id: randomUUID(),
      purchaseId: id,
      actorId: user.id,
      actorName: user.displayName,
      action: 'MODIFY_ITEMS',
      detail: `审批调整明细：${before.length} 行 → ${items.length} 行，合计金额 ${yuan(beforeTotal)} → ${yuan(afterTotal)}`,
    });
    return this.get(id, user);
  }

  private async replaceItems(purchaseId: string, items: NormalizedItem[]): Promise<void> {
    await this.items.delete({ purchaseId });
    if (items.length > 0) {
      await this.items.save(
        items.map((item, index) => ({
          id: randomUUID(),
          purchaseId,
          sortOrder: index,
          ...item,
        })),
      );
    }
    const totalAmountCents = items.reduce((sum, item) => sum + item.subtotalCents, 0);
    await this.purchases.update({ id: purchaseId }, { totalAmountCents });
  }

  private async envelope(entity: FoodPurchaseEntity, user: SessionUser) {
    const [items, changeLogs] = await Promise.all([
      this.items.find({ where: { purchaseId: entity.id }, order: { sortOrder: 'ASC' } }),
      this.changeLogs.find({ where: { purchaseId: entity.id }, order: { createdAt: 'ASC' } }),
    ]);
    const canModerate = await this.workflow
      .getModeratableDocument(entity.id, user)
      .then(() => true)
      .catch(() => false);
    return {
      data: { ...entity, items, changeLogs, canModerate },
      document: await this.workflow.getDocument(entity.id),
      opinions: await this.workflow.readOpinions(entity.id),
    };
  }
}

function normalizeItems(items: FoodPurchaseItemDto[]): NormalizedItem[] {
  return items.map((item) => {
    const unitPriceCents =
      item.unitPriceCents === null || item.unitPriceCents === undefined
        ? null
        : item.unitPriceCents;
    return {
      category: item.category?.trim() ?? '',
      name: item.name.trim(),
      specification: item.specification?.trim() ?? '',
      unit: item.unit.trim(),
      quantity: item.quantity,
      requirement: item.requirement?.trim() ?? '',
      unitPriceCents,
      subtotalCents: (unitPriceCents ?? 0) * item.quantity,
      remark: item.remark?.trim() ?? '',
    };
  });
}

function titleFor(items: NormalizedItem[]): string {
  const first = items[0]?.name ?? '食材';
  return items.length > 1 ? `食材采购：${first}等${items.length}项` : `食材采购：${first}`;
}

function yuan(cents: number): string {
  return `¥${(cents / 100).toFixed(2)}`;
}
