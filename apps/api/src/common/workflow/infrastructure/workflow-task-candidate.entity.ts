import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('workflow_task_candidates')
@Index(['taskId', 'userId'], { unique: true })
export class WorkflowTaskCandidateEntity {
  @PrimaryColumn('text')
  id!: string;

  @Index()
  @Column('text')
  taskId!: string;

  @Index()
  @Column('text')
  userId!: string;

  @Column('text')
  source!: 'APPLICANT_DEPARTMENT_MANAGER' | 'ROLE' | 'USER';

  @Column('text', { nullable: true })
  roleCode!: string | null;

  @Column('text', { nullable: true })
  departmentId!: string | null;
}
