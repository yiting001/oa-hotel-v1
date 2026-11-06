import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/** 单据附件：上传后按 id 引用并下载，避免把文件内容写进单据 JSON 列。 */
@Entity('document_attachments')
export class DocumentAttachmentEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  fileName!: string;

  @Column('text')
  storedName!: string;

  @Column('text')
  mimeType!: string;

  @Column('integer')
  sizeBytes!: number;

  @Column('text')
  uploaderId!: string;

  @Column('text')
  uploaderName!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
