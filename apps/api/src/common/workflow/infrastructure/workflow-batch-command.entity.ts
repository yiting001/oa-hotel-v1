import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('workflow_batch_commands')
export class WorkflowBatchCommandEntity {
  @PrimaryColumn('text')
  requestId!: string;

  @Index()
  @Column('text')
  actorId!: string;

  @Column('text')
  payloadHash!: string;

  @Column('simple-json')
  resultJson!: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;
}
