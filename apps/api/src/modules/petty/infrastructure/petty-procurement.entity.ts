import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('petty_procurements')
export class PettyProcurementEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text', { unique: true })
  number!: string;

  @Column('text')
  title!: string;

  @Column('integer')
  totalAmountCents!: number;

  @Column('text', { nullable: true })
  remark!: string | null;

  /** 餐饮食品原材料请购单的「班组」。 */
  @Column('text', { default: '' })
  teamName!: string;

  /** 线下请购单的日期（YYYY-MM-DD）。 */
  @Column('text', { default: '' })
  applicationDate!: string;

  @Column('text')
  applicantId!: string;

  @Column('text')
  departmentId!: string;

  @Column('simple-json')
  attachments!: string[];
}
