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

  /** APPROVAL：常规审批节点；CHOICE：需要办理人选择下一步审核方。 */
  @Column('text', { default: 'APPROVAL' })
  nodeKind!: 'APPROVAL' | 'CHOICE';

  /** 分支任务指向发起它的「人工选择」待办。 */
  @Index()
  @Column('text', { nullable: true })
  originTaskId!: string | null;

  /** 分支任务展示名（如「外部律师」「工程部审核」）。 */
  @Column('text', { nullable: true })
  branchLabel!: string | null;

  @Column('text', { default: 'ROLE' })
  assigneeType!: 'APPLICANT_DEPARTMENT_MANAGER' | 'DEPARTMENT_MANAGER' | 'ROLE' | 'USER';

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
