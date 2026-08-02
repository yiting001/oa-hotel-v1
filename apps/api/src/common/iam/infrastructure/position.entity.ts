import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('iam_positions')
export class PositionEntity {
  @PrimaryColumn('text')
  id!: string;

  @Index({ unique: true })
  @Column('text')
  code!: string;

  @Column('text')
  name!: string;

  @Index()
  @Column('text', { nullable: true })
  departmentId!: string | null;

  @Column('integer', { default: 0 })
  sortOrder!: number;

  @Column('boolean', { default: true })
  active!: boolean;
}
