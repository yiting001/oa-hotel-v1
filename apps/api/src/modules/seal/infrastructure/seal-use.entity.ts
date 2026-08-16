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

  @Column('text')
  purpose!: string;

  @Column('simple-json')
  sealAssetNames!: string[];

  @Column('text')
  content!: string;

  @Column('simple-json')
  attachments!: string[];

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
