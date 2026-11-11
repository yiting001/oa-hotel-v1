import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { DATETIME_COLUMN_TYPE } from '../../database/column-types';
import type { FormDefinition } from '../domain/form-design.types';

@Entity('form_definitions')
export class FormDefinitionEntity implements FormDefinition {
  @PrimaryColumn('text')
  id!: string;

  @Column('text', { unique: true })
  code!: string;

  @Column('text')
  name!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('text', { nullable: true, unique: true })
  documentType!: string | null;

  @Column('boolean', { default: true })
  active!: boolean;

  @Column('text')
  createdBy!: string;

  @CreateDateColumn({ type: DATETIME_COLUMN_TYPE })
  createdAt!: Date;

  @UpdateDateColumn({ type: DATETIME_COLUMN_TYPE })
  updatedAt!: Date;
}
