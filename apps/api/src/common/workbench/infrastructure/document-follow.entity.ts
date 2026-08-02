import { CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('document_follows')
@Index('IDX_document_follow_user_created', ['userId', 'createdAt'])
export class DocumentFollowEntity {
  @PrimaryColumn('text')
  documentId!: string;

  @PrimaryColumn('text')
  userId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
