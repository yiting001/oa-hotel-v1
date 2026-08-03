import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { DATETIME_COLUMN_TYPE } from '../../database/column-types';
import type { FormVersion, FormVersionStatus } from '../domain/form-design.types';

@Entity('form_versions')
@Index(['definitionId', 'version'], { unique: true })
export class FormVersionEntity implements FormVersion {
  @PrimaryColumn('text')
  id!: string;

  @Index()
  @Column('text')
  definitionId!: string;

  @Column('integer')
  version!: number;

  @Index()
  @Column('text')
  status!: FormVersionStatus;

  @Column('simple-json')
  schemaJson!: Record<string, unknown>;

  @Column('simple-json')
  printSchemaJson!: Record<string, unknown>;

  @Column('text', { nullable: true })
  changeNote!: string | null;

  @Column('text')
  createdBy!: string;

  @Column('text')
  updatedBy!: string;

  @Column(DATETIME_COLUMN_TYPE, { nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
