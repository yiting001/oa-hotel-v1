import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('seal_borrow_requests')
export class SealBorrowEntity {
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
  plannedReturnDate!: string;

  @Column('simple-json')
  companionIds!: string[];

  @Column('text')
  destination!: string;

  @Column('simple-json')
  sealAssetNames!: string[];

  @Column('text')
  content!: string;

  @Column('simple-json')
  attachments!: string[];

  @Column('text', { default: 'NOT_CHECKED_OUT' })
  executionStatus!: string;

  @Column('text', { nullable: true })
  actualRecipient!: string | null;

  @Column('text', { nullable: true })
  checkedOutAt!: string | null;

  @Column('text', { nullable: true })
  returnedAt!: string | null;

  @Column('text', { nullable: true })
  returnCondition!: string | null;

  @Column('text', { nullable: true })
  exceptionNote!: string | null;
}
