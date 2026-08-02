import { Column, Entity, PrimaryColumn } from 'typeorm';

/** Extends the legacy department table without changing the authentication model. */
@Entity('iam_department_profiles')
export class DepartmentProfileEntity {
  @PrimaryColumn('text')
  departmentId!: string;

  @Column('text', { nullable: true })
  parentDepartmentId!: string | null;

  @Column('integer', { default: 0 })
  sortOrder!: number;

  @Column('boolean', { default: true })
  active!: boolean;
}
