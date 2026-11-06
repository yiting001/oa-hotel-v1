import type { DocumentAttachmentItem } from '@oa/contracts';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('contracts')
export class ContractEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text', { unique: true })
  number!: string;

  @Column('text', { nullable: true })
  requestId!: string | null;

  @Column('text')
  signingDepartmentId!: string;

  @Column('text')
  signingDate!: string;

  @Column('text')
  name!: string;

  @Column('integer')
  amountCents!: number;

  @Column('text')
  counterpartyFullName!: string;

  @Column('text', { nullable: true })
  counterpartyContact!: string | null;

  @Column('text', { nullable: true })
  counterpartyPhone!: string | null;

  @Column('text', { nullable: true })
  validFrom!: string | null;

  @Column('text', { nullable: true })
  validTo!: string | null;

  @Column('text')
  contentReason!: string;

  @Column('text', { nullable: true })
  remark!: string | null;

  /** 遗留下单开关：新数据由 sealType 推导，保留用于历史 A4 版本重放。 */
  @Column('boolean', { default: false })
  needsSeal!: boolean;

  /** 用印类型：CONTRACT_SEAL=合同章，OFFICIAL_SEAL=公章，空表示不需要用印。 */
  @Column('text', { nullable: true })
  sealType!: string | null;

  @Column('text')
  applicantId!: string;

  /** 上传附件（{ id, fileName }）与历史文件名（字符串）混排。 */
  @Column('simple-json')
  attachments!: DocumentAttachmentItem[];
}
