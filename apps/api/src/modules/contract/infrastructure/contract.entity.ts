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

  @Column('text')
  contentReason!: string;

  @Column('boolean', { default: false })
  needsSeal!: boolean;

  @Column('text')
  applicantId!: string;

  @Column('simple-json')
  attachments!: string[];
}
