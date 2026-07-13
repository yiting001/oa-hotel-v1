import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { PurchaseItem } from '../domain/supply-types';

@Entity('material_purchase_requests')
export class MaterialPurchaseEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text', { unique: true })
  number!: string;

  @Column('text')
  applicantId!: string;

  @Column('text')
  departmentId!: string;

  @Column('text')
  applicationDate!: string;

  @Column('simple-json')
  items!: PurchaseItem[];

  @Column('integer')
  taxableUnitPriceTotalCents!: number;

  @Column('integer')
  taxableAmountTotalCents!: number;
}
