import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('contract_payments')
export class ContractPaymentEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text', { unique: true })
  number!: string;

  @Column('text')
  contractId!: string;

  @Column('text')
  applicantId!: string;

  @Column('text')
  departmentId!: string;

  @Column('text')
  project!: string;

  @Column('text')
  contractStartDate!: string;

  @Column('text')
  contractEndDate!: string;

  @Column('text')
  contractSigningDate!: string;

  @Column('integer')
  contractAmountCents!: number;

  @Column('integer')
  budgetAmountCents!: number;

  @Column('integer')
  budgetExecutedCents!: number;

  @Column('text')
  accountingSubject!: string;

  @Column('integer', { nullable: true })
  maintenanceEstimateCents!: number | null;

  @Column('text')
  counterpartyFullName!: string;

  @Column('integer')
  plannedPaymentCount!: number;

  @Column('integer')
  paymentSequence!: number;

  @Column('integer')
  executedAmountCents!: number;

  @Column('integer')
  remainingAmountCents!: number;

  @Column('text')
  plannedProgress!: string;

  @Column('text')
  actualProgress!: string;

  @Column('text')
  progressVariance!: string;

  @Column('text')
  paymentMethod!: string;

  @Column('text')
  paymentReason!: string;

  @Column('text', { nullable: true })
  invoiceNumber!: string | null;

  @Column('text', { nullable: true })
  warrantyStartDate!: string | null;

  @Column('text', { nullable: true })
  warrantyEndDate!: string | null;

  @Column('integer')
  paymentAmountCents!: number;

  @Column('text')
  paymentAmountUppercase!: string;

  @Column('simple-json')
  attachments!: string[];
}
