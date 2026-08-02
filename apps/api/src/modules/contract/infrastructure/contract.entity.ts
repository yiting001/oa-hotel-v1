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
  paymentMethod!: string | null;

  @Column('text', { nullable: true })
  validFrom!: string | null;

  @Column('text', { nullable: true })
  validTo!: string | null;

  @Column('text')
  contentReason!: string;

  @Column('text', { nullable: true })
  remark!: string | null;

  @Column('boolean', { default: false })
  needsSeal!: boolean;

  @Column('text')
  applicantId!: string;

  @Column('simple-json')
  attachments!: string[];
}
