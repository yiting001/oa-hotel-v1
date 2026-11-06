import type { DocumentAttachmentItem } from '@oa/contracts';
import { Column, Entity, PrimaryColumn } from 'typeorm';

/** 食材采购单：明细单独存表，单头只保留申请人与合计金额。 */
@Entity('food_purchases')
export class FoodPurchaseEntity {
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

  /** 班组：对应线下《餐饮食品原材料请购单》表头。 */
  @Column('text', { default: '' })
  teamName!: string;

  @Column('integer', { default: 0 })
  totalAmountCents!: number;

  /** 上传附件（{ id, fileName }）与历史文件名（字符串）混排。 */
  @Column('simple-json')
  attachments!: DocumentAttachmentItem[];
}
