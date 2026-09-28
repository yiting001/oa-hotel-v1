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

  /** 内部请示的致送单位（线下单子「致送」）。 */
  @Column('text', { default: '' })
  addressee!: string;

  /** 内部请示的发出部门（线下单子「发出」）。 */
  @Column('text', { default: '' })
  issuer!: string;

  @Column('simple-json')
  attachments!: string[];
}
