import type { DocumentAttachmentItem } from '@oa/contracts';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('seal_use_requests')
export class SealUseEntity {
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
  useDate!: string;

  /** 公章外带时的归还日期；不外带为空。 */
  @Column('text', { nullable: true })
  plannedReturnDate!: string | null;

  @Column('text')
  purpose!: string;

  @Column('simple-json')
  sealAssetNames!: string[];

  /** 线下申请单的「报送单位」。 */
  @Column('text', { default: '' })
  submitTo!: string;

  /** 用章类别及数量：[{ name: '饭店章', copies: 2 }]。 */
  @Column('simple-json', { default: '[]' })
  sealCategories!: Array<{ name: string; copies: number }>;

  /** 公章外带：是 / 否。 */
  @Column('boolean', { default: false })
  sealTakeout!: boolean;

  /** 证照外带：是 / 否。 */
  @Column('boolean', { default: false })
  licenseTakeout!: boolean;

  @Column('text')
  content!: string;

  /** 上传附件（{ id, fileName }）与历史文件名（字符串）混排。 */
  @Column('simple-json')
  attachments!: DocumentAttachmentItem[];

  @Column('text', { default: 'NOT_EXECUTED' })
  executionStatus!: string;

  @Column('integer', { nullable: true })
  stampedCopies!: number | null;

  @Column('text', { nullable: true })
  executedAt!: string | null;

  @Column('text', { nullable: true })
  archiveNumber!: string | null;

  @Column('text', { nullable: true })
  executionNote!: string | null;
}
