import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { createDocumentNumber } from '../../../common/domain/document-number';
import { DocumentWorkflowService } from '../../../common/workflow/application/document-workflow.service';
import { PurchaseEntity } from '../infrastructure/purchase.entity';
import type { PurchaseDto } from '../presentation/purchase.dto';

@Injectable()
export class PurchaseApplicationService {
  constructor(
    @InjectRepository(PurchaseEntity)
    private readonly purchases: Repository<PurchaseEntity>,
    @Inject(DocumentWorkflowService)
    private readonly workflow: DocumentWorkflowService,
  ) {}

  async save(dto: PurchaseDto, user: SessionUser, id?: string) {
    if (id) {
      await this.workflow.getEditable(id, user);
      const current = await this.purchases.findOneBy({ id });
      if (!current) {
        throw new NotFoundException('采购审批单不存在');
      }
      const saved = await this.purchases.save({ ...current, ...dto });
      await this.workflow.updateDraftTitle(id, dto.name, user);
      return this.withIndex(saved);
    }
    const documentId = randomUUID();
    const saved = await this.purchases.save({
      id: documentId,
      number: createDocumentNumber('PURCHASE', documentId),
      applicantId: user.id,
      departmentId: user.departmentId,
      ...dto,
    });
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

  private async withIndex(entity: PurchaseEntity) {
    return {
      data: entity,
      document: await this.workflow.getDocument(entity.id),
      opinions: await this.workflow.readOpinions(entity.id),
    };
  }
}
