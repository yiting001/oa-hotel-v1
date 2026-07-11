import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { RequisitionItem } from '../domain/supply-types';

@Entity('material_requisitions')
export class MaterialRequisitionEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text', { unique: true })
  number!: string;

  @Column('text')
  applicantId!: string;

  @Column('text')
  departmentId!: string;

  @Column('text')
  contactUserId!: string;

  @Column('text')
  applicationDate!: string;

  @Column('simple-json')
  items!: RequisitionItem[];

  @Column('simple-json')
  attachments!: string[];

  @Column('text', { default: 'NOT_ISSUED' })
  issueStatus!: string;

  @Column('text', { nullable: true })
  issuedAt!: string | null;

  @Column('text', { nullable: true })
  issuedBy!: string | null;
}
