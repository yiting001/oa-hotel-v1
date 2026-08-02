import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import type { ProcessVersion, ProcessVersionStatus } from '../domain/process-design.types';

@Entity('process_versions')
@Index(['definitionId', 'version'], { unique: true })
export class ProcessVersionEntity implements ProcessVersion {
  @PrimaryColumn('text')
  id!: string;

  @Index()
  @Column('text')
  definitionId!: string;

  @Column('integer')
  version!: number;

  @Index()
  @Column('text')
  status!: ProcessVersionStatus;

  @Column('simple-json')
  designJson!: Record<string, unknown>;

  @Column('text', { nullable: true })
  changeNote!: string | null;

  @Column('text')
  createdBy!: string;

  @Column('text')
  updatedBy!: string;

  @Column('datetime', { nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
