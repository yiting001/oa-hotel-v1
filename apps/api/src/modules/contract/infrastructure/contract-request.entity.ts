import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('contract_requests')
export class ContractRequestEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text', { unique: true })
  number!: string;

  @Column('text')
  title!: string;

  @Column('text')
  departmentId!: string;

  @Column('text')
  applicantId!: string;

  @Column('text')
  requestedAt!: string;

  @Column('integer', { nullable: true })
  amountCents!: number | null;

  @Column('text')
  content!: string;

  @Column('simple-json')
  attachments!: string[];
}
