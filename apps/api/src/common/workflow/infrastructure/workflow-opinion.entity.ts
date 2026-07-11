import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('workflow_opinions')
export class WorkflowOpinionEntity {
  @PrimaryColumn('text')
  id!: string;

  @Index()
  @Column('text')
  documentId!: string;

  @Column('text')
  taskId!: string;

  @Column('text')
  actorId!: string;

  @Column('text')
  actorName!: string;

  @Column('text')
  action!: string;

  @Column('text', { default: '' })
  comment!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
