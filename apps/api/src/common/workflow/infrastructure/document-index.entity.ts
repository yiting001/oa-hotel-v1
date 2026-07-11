import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('document_indexes')
export class DocumentIndexEntity {
  @PrimaryColumn('text')
  id!: string;

  @Index()
  @Column('text')
  documentType!: string;

  @Index()
  @Column('text')
  module!: string;

  @Column('text')
  title!: string;

  @Index()
  @Column('text')
  applicantId!: string;

  @Index()
  @Column('text')
  departmentId!: string;

  @Index()
  @Column('text', { default: 'DRAFT' })
  status!: string;

  @Column('integer', { default: 1 })
  revision!: number;

  @Column('integer', { nullable: true })
  currentStep!: number | null;

  @Column('text')
  workflowCode!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
