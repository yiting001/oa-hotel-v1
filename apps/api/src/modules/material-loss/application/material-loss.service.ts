import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { normalizeAttachments } from '../../../common/storage/attachment-items';
import { businessDateIso } from '../../../common/time/business-date';
import { DocumentNumberService } from '../../../common/workflow/application/document-number.service';
import { DocumentWorkflowService } from '../../../common/workflow/application/document-workflow.service';
import { MaterialLossItemEntity } from '../infrastructure/material-loss-item.entity';
import { MaterialLossEntity } from '../infrastructure/material-loss.entity';
import type { MaterialLossDto, MaterialLossItemDto } from '../presentation/material-loss.dto';

interface NormalizedItem {
  name: string;
  specification: string;
  unit: string;
  quantity: number;
  unitPriceCents: number | null;
  subtotalCents: number;
  remark: string;
}

@Injectable()
export class MaterialLossService {
  constructor(
    @InjectRepository(MaterialLossEntity)
    private readonly losses: Repository<MaterialLossEntity>,
    @InjectRepository(MaterialLossItemEntity)
    private readonly items: Repository<MaterialLossItemEntity>,
    @Inject(DocumentWorkflowService)
    private readonly workflow: DocumentWorkflowService,
    @Inject(DocumentNumberService)
    private readonly documentNumbers: DocumentNumberService,
    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {}

  async save(dto: MaterialLossDto, user: SessionUser, id?: string) {
    const items = normalizeItems(dto.items);
    const attachments = normalizeAttachments(dto.attachments);
    if (id) {
      await this.workflow.getEditable(id, user);
      const current = await this.losses.findOneBy({ id });
      if (!current) {
        throw new NotFoundException('物资报损单不存在');
      }
      await this.losses.save({
        ...current,
        applicationDate: dto.applicationDate ?? current.applicationDate,
        reason: dto.reason.trim(),
        attachments,
      });
      await this.replaceItems(id, items);
      await this.workflow.updateDraftTitle(id, titleFor(items), user);
      return this.get(id, user);
    }

    const documentId = randomUUID();
    // 物资报损单号：部门简称 + 日期 + 序号，例如 GCB20261028-001
    const number = await this.documentNumbers.generateForDepartment(
      this.dataSource.manager,
      user.departmentName,
    );
    await this.losses.save({
      id: documentId,
      number,
      applicantId: user.id,
      departmentId: user.departmentId,
      applicationDate: dto.applicationDate ?? businessDateIso(),
      reason: dto.reason.trim(),
      totalAmountCents: 0,
      attachments,
    });
    await this.replaceItems(documentId, items);
    await this.workflow.registerDraft({
      id: documentId,
      documentType: 'MATERIAL_LOSS',
      module: 'MATERIAL_LOSS',
      title: titleFor(items),
      applicantId: user.id,
      departmentId: user.departmentId,
      documentNo: number,
    });
    return this.get(documentId, user);
  }

  async get(id: string, user: SessionUser) {
    await this.workflow.getViewableDocument(id, user);
    const entity = await this.losses.findOneBy({ id });
    if (!entity) {
      throw new NotFoundException('物资报损单不存在');
    }
    return {
      data: {
        ...entity,
        items: await this.items.find({ where: { lossId: id }, order: { sortOrder: 'ASC' } }),
      },
      document: await this.workflow.getDocument(id),
      opinions: await this.workflow.readOpinions(id),
    };
  }

  private async replaceItems(lossId: string, items: NormalizedItem[]): Promise<void> {
    await this.items.delete({ lossId });
    if (items.length > 0) {
      await this.items.save(
        items.map((item, index) => ({
          id: randomUUID(),
          lossId,
          sortOrder: index,
          ...item,
        })),
      );
    }
    const totalAmountCents = items.reduce((sum, item) => sum + item.subtotalCents, 0);
    await this.losses.update({ id: lossId }, { totalAmountCents });
  }
}

function normalizeItems(items: MaterialLossItemDto[]): NormalizedItem[] {
  return items.map((item) => {
    const unitPriceCents =
      item.unitPriceCents === null || item.unitPriceCents === undefined
        ? null
        : item.unitPriceCents;
    return {
      name: item.name.trim(),
      specification: item.specification?.trim() ?? '',
      unit: item.unit.trim(),
      quantity: item.quantity,
      unitPriceCents,
      subtotalCents: (unitPriceCents ?? 0) * item.quantity,
      remark: item.remark?.trim() ?? '',
    };
  });
}

function titleFor(items: NormalizedItem[]): string {
  const first = items[0]?.name ?? '物资';
  return items.length > 1 ? `物资报损：${first}等${items.length}项` : `物资报损：${first}`;
}
