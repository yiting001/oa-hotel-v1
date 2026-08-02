import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { SessionUser } from '@oa/contracts';
import { randomUUID } from 'node:crypto';
import { In, Repository } from 'typeorm';
import { createDocumentNumber } from '../../../common/domain/document-number';
import { DomainError } from '../../../common/errors/domain-error';
import { DocumentWorkflowService } from '../../../common/workflow/application/document-workflow.service';
import { PettyChangeLogEntity } from '../infrastructure/petty-change-log.entity';
import { PettyMaterialEntity } from '../infrastructure/petty-material.entity';
import { PettyProcurementItemEntity } from '../infrastructure/petty-procurement-item.entity';
import { PettyProcurementEntity } from '../infrastructure/petty-procurement.entity';
import type {
  PettyItemQuantityDto,
  PettyMaterialDto,
  PettyProcurementDto,
} from '../presentation/petty.dto';

function yuan(cents: number): string {
  return `${(cents / 100).toFixed(2)}元`;
}

@Injectable()
export class PettyApplicationService {
  constructor(
    @InjectRepository(PettyMaterialEntity)
    private readonly materials: Repository<PettyMaterialEntity>,
    @InjectRepository(PettyProcurementEntity)
    private readonly procurements: Repository<PettyProcurementEntity>,
    @InjectRepository(PettyProcurementItemEntity)
    private readonly items: Repository<PettyProcurementItemEntity>,
    @InjectRepository(PettyChangeLogEntity)
    private readonly changeLogs: Repository<PettyChangeLogEntity>,
    @Inject(DocumentWorkflowService)
    private readonly workflow: DocumentWorkflowService,
  ) {}

  listMaterials(): Promise<PettyMaterialEntity[]> {
    return this.materials.find({ order: { name: 'ASC', brand: 'ASC' } });
  }

  async saveMaterial(dto: PettyMaterialDto, id?: string): Promise<PettyMaterialEntity> {
    if (id) {
      const current = await this.materials.findOneBy({ id });
      if (!current) {
        throw new NotFoundException('物资不存在');
      }
      return this.materials.save({ ...current, ...dto, active: dto.active ?? current.active });
    }
    return this.materials.save({ id: randomUUID(), ...dto, active: dto.active ?? true });
  }

  async importMaterials(materials: PettyMaterialDto[]): Promise<{ imported: number }> {
    const rows = materials.map((material) => ({
      id: randomUUID(),
      ...material,
      active: material.active ?? true,
    }));
    await this.materials.save(rows);
    return { imported: rows.length };
  }

  async removeMaterial(id: string): Promise<void> {
    const current = await this.materials.findOneBy({ id });
    if (!current) {
      throw new NotFoundException('物资不存在');
    }
    await this.materials.save({ ...current, active: false });
  }

  async save(dto: PettyProcurementDto, user: SessionUser, id?: string) {
    const { items, totalAmountCents } = await this.buildItems(dto);
    if (id) {
      await this.workflow.getEditable(id, user);
      const current = await this.procurements.findOneBy({ id });
      if (!current) {
        throw new NotFoundException('零星采买单不存在');
      }
      const saved = await this.procurements.save({
        ...current,
        title: dto.title,
        remark: dto.remark,
        totalAmountCents,
        attachments: dto.attachments,
      });
      await this.items.delete({ procurementId: id });
      await this.items.save(items.map((item) => ({ ...item, procurementId: id })));
      await this.workflow.updateDraftTitle(id, dto.title, user);
      return this.envelope(saved, user);
    }
    const documentId = randomUUID();
    const saved = await this.procurements.save({
      id: documentId,
      number: createDocumentNumber('PETTY', documentId),
      title: dto.title,
      remark: dto.remark,
      totalAmountCents,
      applicantId: user.id,
      departmentId: user.departmentId,
      attachments: dto.attachments,
    });
    await this.items.save(items.map((item) => ({ ...item, procurementId: documentId })));
    await this.workflow.registerDraft({
      id: documentId,
      documentType: 'PETTY_PROCUREMENT',
      module: 'PETTY',
      title: dto.title,
      applicantId: user.id,
      departmentId: user.departmentId,
    });
    return this.envelope(saved, user);
  }

  async get(id: string, user: SessionUser) {
    await this.workflow.getViewableDocument(id, user);
    const entity = await this.procurements.findOneBy({ id });
    if (!entity) {
      throw new NotFoundException('零星采买单不存在');
    }
    return this.envelope(entity, user);
  }

  async updateItemQuantity(
    procurementId: string,
    itemId: string,
    dto: PettyItemQuantityDto,
    user: SessionUser,
  ) {
    await this.workflow.getModeratableDocument(procurementId, user);
    const item = await this.items.findOneBy({ id: itemId, procurementId });
    if (!item) {
      throw new NotFoundException('采买明细不存在');
    }
    const previousQuantity = item.quantity;
    if (previousQuantity === dto.quantity) {
      throw new DomainError('PETTY_QUANTITY_UNCHANGED', '数量未发生变化');
    }
    item.quantity = dto.quantity;
    item.subtotalCents = item.unitPriceCents * dto.quantity;
    await this.items.save(item);
    await this.refreshTotal(procurementId);
    await this.log(
      procurementId,
      user,
      'MODIFY_QUANTITY',
      `将「${item.name}（${item.brand}）」数量由 ${previousQuantity}${item.unit} 调整为 ${dto.quantity}${item.unit}`,
    );
    return this.get(procurementId, user);
  }

  async removeItem(procurementId: string, itemId: string, user: SessionUser) {
    await this.workflow.getModeratableDocument(procurementId, user);
    const item = await this.items.findOneBy({ id: itemId, procurementId });
    if (!item) {
      throw new NotFoundException('采买明细不存在');
    }
    const remaining = await this.items.countBy({ procurementId });
    if (remaining <= 1) {
      throw new DomainError('PETTY_LAST_ITEM', '至少保留一条采买明细，可改用整单驳回');
    }
    await this.items.delete({ id: itemId });
    await this.refreshTotal(procurementId);
    await this.log(
      procurementId,
      user,
      'REMOVE_ITEM',
      `删除明细「${item.name}（${item.brand}）」×${item.quantity}${item.unit}（小计 ${yuan(item.subtotalCents)}）`,
    );
    return this.get(procurementId, user);
  }

  private async buildItems(dto: PettyProcurementDto) {
    const materialIds = dto.items.map((item) => item.materialId);
    const materials = await this.materials.findBy({ id: In(materialIds) });
    const materialMap = new Map(materials.map((material) => [material.id, material]));
    const items: PettyProcurementItemEntity[] = dto.items.map((item) => {
      const material = materialMap.get(item.materialId);
      if (!material || !material.active) {
        throw new DomainError('PETTY_MATERIAL_MISSING', '所选物资不存在或已停用');
      }
      return {
        id: randomUUID(),
        procurementId: '',
        materialId: material.id,
        name: material.name,
        brand: material.brand,
        unit: material.unit,
        unitPriceCents: material.unitPriceCents,
        quantity: item.quantity,
        subtotalCents: material.unitPriceCents * item.quantity,
      };
    });
    const totalAmountCents = items.reduce((sum, item) => sum + item.subtotalCents, 0);
    return { items, totalAmountCents };
  }

  private async refreshTotal(procurementId: string): Promise<void> {
    const items = await this.items.findBy({ procurementId });
    const totalAmountCents = items.reduce((sum, item) => sum + item.subtotalCents, 0);
    await this.procurements.update({ id: procurementId }, { totalAmountCents });
  }

  private async log(
    procurementId: string,
    user: SessionUser,
    action: string,
    detail: string,
  ): Promise<void> {
    await this.changeLogs.save({
      id: randomUUID(),
      procurementId,
      actorId: user.id,
      actorName: user.displayName,
      action,
      detail,
    });
  }

  private async envelope(entity: PettyProcurementEntity, user: SessionUser) {
    const [items, changeLogs, document, opinions] = await Promise.all([
      this.items.find({ where: { procurementId: entity.id }, order: { name: 'ASC' } }),
      this.changeLogs.find({ where: { procurementId: entity.id }, order: { createdAt: 'ASC' } }),
      this.workflow.getDocument(entity.id),
      this.workflow.readOpinions(entity.id),
    ]);
    const canModerate = await this.workflow
      .getModeratableDocument(entity.id, user)
      .then(() => true)
      .catch(() => false);
    return {
      data: { ...entity, items, changeLogs, canModerate },
      document,
      opinions,
    };
  }
}
