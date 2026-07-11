import { CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('workflow_commands')
export class WorkflowCommandEntity {
  @PrimaryColumn('text')
  requestId!: string;

  @Index()
  @PrimaryColumn('text')
  documentId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
