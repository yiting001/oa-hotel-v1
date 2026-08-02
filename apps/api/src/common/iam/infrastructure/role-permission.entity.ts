import { Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('iam_role_permissions')
@Index(['permissionId'])
export class RolePermissionEntity {
  @PrimaryColumn('text')
  roleId!: string;

  @PrimaryColumn('text')
  permissionId!: string;
}
