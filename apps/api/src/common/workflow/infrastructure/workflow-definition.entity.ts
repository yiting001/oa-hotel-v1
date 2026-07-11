import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('workflow_definitions')
export class WorkflowDefinitionEntity {
  @PrimaryColumn('text')
  code!: string;

  @Column('text', { unique: true })
  documentType!: string;

  @Column('text')
  name!: string;

  @Column('simple-json')
  steps!: string[];

  @Column('integer', { default: 1 })
  version!: number;

  @Column('boolean', { default: true })
  active!: boolean;
}
