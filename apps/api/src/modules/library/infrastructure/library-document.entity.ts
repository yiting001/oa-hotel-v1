import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export const LIBRARY_CATEGORIES = [
  'REGULATION',
  'LAW',
  'POLICY',
  'PROMOTION',
  'PHOTO',
  'OTHER',
] as const;

export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number];

/** 公司文件制度与资料库：制度、法规、政策、宣传材料与公司照片。 */
@Entity('library_documents')
export class LibraryDocumentEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  title!: string;

  @Index()
  @Column('text')
  category!: LibraryCategory;

  @Column('text', { default: '' })
  description!: string;

  /** 上传时的原始文件名，下载时回填。 */
  @Column('text')
  fileName!: string;

  /** 存储文件名（UUID + 扩展名），不暴露给客户端。 */
  @Column('text')
  storedName!: string;

  @Column('text')
  mimeType!: string;

  @Column('integer')
  sizeBytes!: number;

  @Column('text')
  uploaderId!: string;

  /** 上传人姓名快照，避免列表查询再关联组织数据。 */
  @Column('text')
  uploaderName!: string;

  @Column('integer', { default: 0 })
  downloadCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
