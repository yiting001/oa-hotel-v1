import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** 食材采购明细：品类 / 品名 / 规格 / 数量 / 单位 / 单价 / 总价 / 备注。 */
@Entity('food_purchase_items')
export class FoodPurchaseItemEntity {
  @PrimaryColumn('text')
  id!: string;

  @Index()
  @Column('text')
  purchaseId!: string;

  @Column('integer', { default: 0 })
  sortOrder!: number;

  /** 品类（蔬菜类、肉禽类等），支持手填。 */
  @Column('text', { default: '' })
  category!: string;

  @Column('text')
  name!: string;

  @Column('text', { default: '' })
  specification!: string;

  @Column('text', { default: '' })
  unit!: string;

  @Column('integer', { default: 1 })
  quantity!: number;

  /** 要求：对应线下请购单的“要求”列（如新鲜、切块）。 */
  @Column('text', { default: '' })
  requirement!: string;

  /** 发起人可不填单价，审批领导可后续补充。 */
  @Column('integer', { nullable: true })
  unitPriceCents!: number | null;

  @Column('integer', { default: 0 })
  subtotalCents!: number;

  @Column('text', { default: '' })
  remark!: string;
}
