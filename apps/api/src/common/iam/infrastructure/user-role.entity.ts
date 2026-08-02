import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { DataScope } from '../domain/data-scope';

@Entity('iam_user_roles')
@Index(['userId', 'roleId'])
export class UserRoleEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  userId!: string;

  @Column('text')
  roleId!: string;

  @Column('text', { default: DataScope.SELF })
  dataScope!: DataScope;

  /** Department anchor is mandatory for department-scoped grants only. */
  @Column('text', { nullable: true })
  scopeDepartmentId!: string | null;
}
