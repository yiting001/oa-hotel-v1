import { Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('iam_role_menus')
@Index(['menuId'])
export class RoleMenuEntity {
  @PrimaryColumn('text')
  roleId!: string;

  @PrimaryColumn('text')
  menuId!: string;
}
