import { CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { DATETIME_COLUMN_TYPE } from '../../database/column-types';

@Entity('workflow_commands')
export class WorkflowCommandEntity {
  @PrimaryColumn('text')
  requestId!: string;

  @Index()
  @PrimaryColumn('text')
  documentId!: string;

  @CreateDateColumn({ type: DATETIME_COLUMN_TYPE })
  createdAt!: Date;
}
