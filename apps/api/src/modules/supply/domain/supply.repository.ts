import type { RequisitionItem } from './supply-types';
import { MaterialItemEntity } from '../infrastructure/material-item.entity';
import { MaterialPurchaseEntity } from '../infrastructure/material-purchase.entity';
import { MaterialRequisitionEntity } from '../infrastructure/material-requisition.entity';

export const SUPPLY_REPOSITORY = Symbol('SUPPLY_REPOSITORY');

export interface SupplyRepository {
  countItems(): Promise<number>;
  saveItems(items: MaterialItemEntity[]): Promise<MaterialItemEntity[]>;
  listItems(): Promise<MaterialItemEntity[]>;
  findItems(ids: string[]): Promise<MaterialItemEntity[]>;
  savePurchase(entity: MaterialPurchaseEntity): Promise<MaterialPurchaseEntity>;
  findPurchase(id: string): Promise<MaterialPurchaseEntity | null>;
  saveRequisition(entity: MaterialRequisitionEntity): Promise<MaterialRequisitionEntity>;
  findRequisition(id: string): Promise<MaterialRequisitionEntity | null>;
  issueItems(
    requisition: MaterialRequisitionEntity,
    issuedItems: RequisitionItem[],
    issuerId: string,
    issuedAt: string,
  ): Promise<MaterialRequisitionEntity>;
}
