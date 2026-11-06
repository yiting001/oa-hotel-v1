import type { DocumentAttachmentItem } from '@oa/contracts';
import { Column, Entity, PrimaryColumn } from 'typeorm';

/** 物资报损单：报损原因 + 明细 + 附件。 */
@Entity('material_losses')
export class MaterialLossEntity {
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

  @Column('text', { default: '' })
  reason!: string;

  @Column('integer', { default: 0 })
  totalAmountCents!: number;

  @Column('simple-json')
  attachments!: DocumentAttachmentItem[];
}
