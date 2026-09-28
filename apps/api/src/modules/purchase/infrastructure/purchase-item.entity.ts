import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** 采购申请单明细：品名 / 规格 / 订购数量 / 单价 / 总价。 */
@Entity('purchase_items')
export class PurchaseItemEntity {
  @PrimaryColumn('text')
  id!: string;

  @Index()
  @Column('text')
  purchaseId!: string;

  @Column('text')
  name!: string;

  @Column('text', { default: '' })
  specification!: string;

  @Column('text', { default: '' })
  unit!: string;

  @Column('integer', { default: 1 })
  quantity!: number;

  @Column('integer', { default: 0 })
  unitPriceCents!: number;

  @Column('integer', { default: 0 })
  subtotalCents!: number;
}
