import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('purchases')
export class PurchaseEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text', { unique: true })
  number!: string;

  @Column('text')
  name!: string;

  @Column('integer')
  amountCents!: number;

  @Column('text')
  counterpartyName!: string;

  @Column('text', { nullable: true })
  counterpartyContact!: string | null;

  @Column('text', { nullable: true })
  counterpartyPhone!: string | null;

  @Column('text', { nullable: true })
  paymentMethod!: string | null;

  @Column('text', { nullable: true })
  expectedDeliveryDate!: string | null;

  @Column('text', { nullable: true })
  remark!: string | null;

  /** 采购类别：非库存品 / 库存用品 / 工程用品 / 固定资产。 */
  @Column('text', { default: 'NON_STOCK' })
  itemCategory!: string;

  /** 预算类别：NONE 无预算 / BUDGET 有预算。 */
  @Column('text', { default: 'NONE' })
  budgetType!: string;

  /** 金额组成：暂计 / 关税 / 增值税 / 其它费用，总价见 amountCents。 */
  @Column('integer', { default: 0 })
  subtotalCents!: number;

  @Column('integer', { default: 0 })
  tariffCents!: number;

  @Column('integer', { default: 0 })
  vatCents!: number;

  @Column('integer', { default: 0 })
  otherFeesCents!: number;

  /** 申请理由及用途。 */
  @Column('text', { default: '' })
  reason!: string;

  /** 经办人姓名。 */
  @Column('text', { default: '' })
  handlerName!: string;

  /** 供应商 A / B / C 报价对象。 */
  @Column('text', { default: '' })
  supplierA!: string;

  @Column('text', { default: '' })
  supplierB!: string;

  @Column('text', { default: '' })
  supplierC!: string;

  /** 需用日期。 */
  @Column('text', { nullable: true })
  requiredDate!: string | null;

  /** 采购订单号（采购部回填）。 */
  @Column('text', { default: '' })
  purchaseOrderNo!: string;

  @Column('text')
  applicantId!: string;

  @Column('text')
  departmentId!: string;

  @Column('simple-json')
  attachments!: string[];
}
