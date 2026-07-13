import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Quantity } from '../../../common/domain/quantity';
import type { SupplyRepository } from '../domain/supply.repository';
import type { RequisitionItem } from '../domain/supply-types';
import { MaterialItemEntity } from './material-item.entity';
import { MaterialPurchaseEntity } from './material-purchase.entity';
import { MaterialRequisitionEntity } from './material-requisition.entity';

@Injectable()
export class TypeOrmSupplyRepository implements SupplyRepository {
  constructor(
    @InjectRepository(MaterialItemEntity)
    private readonly items: Repository<MaterialItemEntity>,
    @InjectRepository(MaterialPurchaseEntity)
    private readonly purchases: Repository<MaterialPurchaseEntity>,
    @InjectRepository(MaterialRequisitionEntity)
    private readonly requisitions: Repository<MaterialRequisitionEntity>,
    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {}

  countItems(): Promise<number> {
    return this.items.count();
  }

  saveItems(items: MaterialItemEntity[]): Promise<MaterialItemEntity[]> {
    return this.items.save(items);
  }

  listItems(): Promise<MaterialItemEntity[]> {
    return this.items.find({ where: { active: true }, order: { name: 'ASC' } });
  }

  findItems(ids: string[]): Promise<MaterialItemEntity[]> {
    return this.items.findBy({ id: In(ids), active: true });
  }

  savePurchase(entity: MaterialPurchaseEntity): Promise<MaterialPurchaseEntity> {
    return this.purchases.save(entity);
  }

  findPurchase(id: string): Promise<MaterialPurchaseEntity | null> {
    return this.purchases.findOneBy({ id });
  }

  saveRequisition(entity: MaterialRequisitionEntity): Promise<MaterialRequisitionEntity> {
    return this.requisitions.save(entity);
  }

  findRequisition(id: string): Promise<MaterialRequisitionEntity | null> {
    return this.requisitions.findOneBy({ id });
  }

  issueItems(
    requisition: MaterialRequisitionEntity,
    issuedItems: RequisitionItem[],
    issuerId: string,
    issuedAt: string,
  ): Promise<MaterialRequisitionEntity> {
    return this.dataSource.transaction(async (manager) => {
      const itemRepository = manager.getRepository(MaterialItemEntity);
      for (const issuedItem of issuedItems) {
        const item = await itemRepository.findOneByOrFail({ id: issuedItem.materialItemId });
        const issued = Quantity.parse(issuedItem.issuedQuantity ?? '0', true);
        const available = Quantity.parse(item.availableQuantity, true);
        item.availableQuantity = available.subtract(issued).toString();
        await itemRepository.save(item);
      }
      requisition.items = issuedItems;
      requisition.issueStatus = issuedItems.every(
        (item) => item.issuedQuantity === item.requestedQuantity,
      )
        ? 'ISSUED'
        : 'PARTIALLY_ISSUED';
      requisition.issuedAt = issuedAt;
      requisition.issuedBy = issuerId;
      return manager.getRepository(MaterialRequisitionEntity).save(requisition);
    });
  }
}
