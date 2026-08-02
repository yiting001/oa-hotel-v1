import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('workflow_tasks')
export class WorkflowTaskEntity {
  @PrimaryColumn('text')
  id!: string;

  @Index()
  @Column('text')
  documentId!: string;

  @Column('integer')
  stepIndex!: number;

  @Column('text', { nullable: true })
  processNodeId!: string | null;

  @Column('text', { default: 'ROLE' })
  assigneeType!: 'APPLICANT_DEPARTMENT_MANAGER' | 'ROLE' | 'USER';

  @Column('text', { nullable: true })
  assigneeValue!: string | null;

  @Index()
  @Column('text')
  assigneeRole!: string;

  @Index()
  @Column('text', { default: 'PENDING' })
  status!: string;

  @Column('text', { nullable: true })
  completedBy!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
