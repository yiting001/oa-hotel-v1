import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { createDocumentNumber } from '../../../common/domain/document-number';
import { DocumentWorkflowService } from '../../../common/workflow/application/document-workflow.service';
import { PurchaseEntity } from '../infrastructure/purchase.entity';
import { PurchaseItemEntity } from '../infrastructure/purchase-item.entity';
import type { PurchaseDto } from '../presentation/purchase.dto';

@Injectable()
export class PurchaseApplicationService {
  constructor(
    @InjectRepository(PurchaseEntity)
    private readonly purchases: Repository<PurchaseEntity>,
    @InjectRepository(PurchaseItemEntity)
    private readonly items: Repository<PurchaseItemEntity>,
    @Inject(DocumentWorkflowService)
    private readonly workflow: DocumentWorkflowService,
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
      return this.withIndex(saved);
    }
    const documentId = randomUUID();
    const saved = await this.purchases.save({
      id: documentId,
      number: createDocumentNumber('PURCHASE', documentId),
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
    });
    return this.withIndex(saved);
  }

  async get(id: string, user: SessionUser) {
    await this.workflow.getViewableDocument(id, user);
    const entity = await this.purchases.findOneBy({ id });
    if (!entity) {
      throw new NotFoundException('采购审批单不存在');
    }
    return this.withIndex(entity);
  }

  /** 明细整体替换，并按「明细小计 + 关税 + 增值税 + 其它费用」重算总价。 */
  private async replaceItems(
    purchaseId: string,
    drafts: PurchaseDto['items'],
  ): Promise<void> {
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
        amountCents:
          subtotalCents + entity.tariffCents + entity.vatCents + entity.otherFeesCents,
      },
    );
  }

  private async withIndex(entity: PurchaseEntity) {
    return {
      data: entity,
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
  };
}
