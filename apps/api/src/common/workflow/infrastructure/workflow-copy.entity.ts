import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, Unique } from 'typeorm';

@Entity('workflow_copies')
@Unique('UQ_workflow_copy_recipient', ['documentId', 'recipientId'])
@Index('IDX_workflow_copy_recipient_read', ['recipientId', 'readAt', 'createdAt'])
export class WorkflowCopyEntity {
  @PrimaryColumn('text')
  id!: string;

  @Index()
  @Column('text')
  documentId!: string;

  @Column('text')
  senderId!: string;

  @Column('text')
  senderName!: string;

  @Column('text')
  recipientId!: string;

  @Column('text')
  recipientName!: string;

  @Column('datetime', { nullable: true })
  readAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
