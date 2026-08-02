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

  @Column('text')
  applicantId!: string;

  @Column('text')
  departmentId!: string;

  @Column('simple-json')
  attachments!: string[];
}
