import type { DocumentAttachmentItem } from '@oa/contracts';
import { Column, Entity, PrimaryColumn } from 'typeorm';

/** 订单流转的抄送对象：保存时固化为 id + 姓名，便于历史单据展示。 */
export interface OrderCcRecipient {
  id: string;
  name: string;
}

/** 订单流转单：发起人填写主要内容并上传附件，同时指定抄送人。 */
@Entity('order_circulations')
export class OrderCirculationEntity {
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

  @Column('text')
  subject!: string;

  @Column('text', { default: '' })
  content!: string;

  @Column('simple-json')
  ccRecipients!: OrderCcRecipient[];

  @Column('simple-json')
  attachments!: DocumentAttachmentItem[];
}
