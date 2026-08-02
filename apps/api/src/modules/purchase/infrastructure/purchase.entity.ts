import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('purchases')
export class PurchaseEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text', { unique: true })
  number!: string;

  @Column('text')
  name!: string;

  @Column('integer')
  amountCents!: number;

  @Column('text')
  counterpartyName!: string;

  @Column('text', { nullable: true })
  counterpartyContact!: string | null;

  @Column('text', { nullable: true })
  counterpartyPhone!: string | null;

  @Column('text', { nullable: true })
  paymentMethod!: string | null;

  @Column('text', { nullable: true })
  expectedDeliveryDate!: string | null;

  @Column('text', { nullable: true })
  remark!: string | null;

  @Column('text')
  applicantId!: string;

  @Column('text')
  departmentId!: string;

  @Column('simple-json')
  attachments!: string[];
}
