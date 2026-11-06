import { CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { DATETIME_COLUMN_TYPE } from '../../database/column-types';

@Entity('document_follows')
@Index('IDX_document_follow_user_created', ['userId', 'createdAt'])
export class DocumentFollowEntity {
  @PrimaryColumn('text')
  documentId!: string;

  @PrimaryColumn('text')
  userId!: string;

  @CreateDateColumn({ type: DATETIME_COLUMN_TYPE })
  createdAt!: Date;
}
