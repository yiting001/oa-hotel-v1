import { Entity, Index, PrimaryColumn } from 'typeorm';

/** 角色被隐藏的菜单：默认所有菜单对角色可见，此表仅记录被管理员关闭的菜单。 */
@Entity('iam_role_hidden_menus')
@Index(['menuId'])
export class RoleHiddenMenuEntity {
  @PrimaryColumn('text')
  roleId!: string;

  @PrimaryColumn('text')
  menuId!: string;
}
