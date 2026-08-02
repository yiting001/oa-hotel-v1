import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, In, Repository } from 'typeorm';
import { DomainError } from '../../errors/domain-error';
import { PermissionEntity } from '../infrastructure/permission.entity';
import { RolePermissionEntity } from '../infrastructure/role-permission.entity';
import { RoleEntity } from '../infrastructure/role.entity';
import { mapRoleSummaries } from './iam-read-model';
import type { RoleCreateInput, RoleSummary, RoleUpdateInput } from './iam.models';

const SYSTEM_ADMIN_CODE = 'SYSTEM_ADMIN';

/** Owns mutable business roles while keeping the permission catalog code-defined. */
@Injectable()
export class IamRoleService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roles: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissions: Repository<PermissionEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly rolePermissions: Repository<RolePermissionEntity>,
    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {}

  async create(input: RoleCreateInput): Promise<RoleSummary> {
    const code = input.code.trim();
    const name = input.name.trim();
    if (!/^[A-Z][A-Z0-9_]*$/.test(code)) {
      throw new DomainError('IAM_ROLE_CODE_INVALID', '角色编码只能使用大写字母、数字和下划线');
    }
    if (!name) throw new DomainError('IAM_ROLE_NAME_REQUIRED', '角色名称不能为空');
    if (await this.roles.exist({ where: { code } })) {
      throw new DomainError('IAM_ROLE_CODE_EXISTS', '角色编码已存在');
    }
    const role = await this.roles.save({
      id: randomUUID(),
      code,
      name,
      description: this.normalizeDescription(input.description),
      active: true,
    });
    return this.toSummary(role);
  }

  async update(roleId: string, input: RoleUpdateInput): Promise<RoleSummary> {
    const role = await this.findRole(roleId);
    if (input.code !== undefined) {
      throw new DomainError('IAM_ROLE_CODE_IMMUTABLE', '角色编码创建后不可修改');
    }
    if (input.name === undefined && input.description === undefined && input.active === undefined) {
      throw new DomainError('IAM_ROLE_UPDATE_EMPTY', '至少需要修改一个角色字段');
    }
    if (role.code === SYSTEM_ADMIN_CODE && input.active === false) {
      throw new DomainError('SYSTEM_ADMIN_ROLE_PROTECTED', '系统管理员角色不能停用');
    }

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new DomainError('IAM_ROLE_NAME_REQUIRED', '角色名称不能为空');
      role.name = name;
    }
    if (input.description !== undefined) {
      role.description = this.normalizeDescription(input.description);
    }
    if (input.active !== undefined) role.active = input.active;
    return this.toSummary(await this.roles.save(role));
  }

  async replacePermissions(roleId: string, permissionIds: string[]): Promise<RoleSummary> {
    const role = await this.findRole(roleId);
    const uniquePermissionIds = [...new Set(permissionIds)];
    await this.assertPermissionsExist(uniquePermissionIds);
    const existing = await this.rolePermissions.findBy({ roleId });
    if (
      role.code === SYSTEM_ADMIN_CODE &&
      existing.some((link) => !uniquePermissionIds.includes(link.permissionId))
    ) {
      throw new DomainError(
        'SYSTEM_ADMIN_PERMISSIONS_PROTECTED',
        '系统管理员角色的权限集合不能被削弱',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(RolePermissionEntity).delete({ roleId });
      if (uniquePermissionIds.length > 0) {
        await manager
          .getRepository(RolePermissionEntity)
          .insert(uniquePermissionIds.map((permissionId) => ({ roleId, permissionId })));
      }
    });
    return this.get(roleId);
  }

  private async get(roleId: string): Promise<RoleSummary> {
    return this.toSummary(await this.findRole(roleId));
  }

  private async findRole(roleId: string): Promise<RoleEntity> {
    const role = await this.roles.findOneBy({ id: roleId });
    if (!role) throw new DomainError('IAM_ROLE_NOT_FOUND', '角色不存在');
    return role;
  }

  private async toSummary(role: RoleEntity): Promise<RoleSummary> {
    const [permissions, links] = await Promise.all([
      this.permissions.find(),
      this.rolePermissions.findBy({ roleId: role.id }),
    ]);
    const summary = mapRoleSummaries([role], permissions, links)[0];
    if (!summary) throw new DomainError('IAM_ROLE_NOT_FOUND', '角色不存在');
    return summary;
  }

  private async assertPermissionsExist(permissionIds: string[]): Promise<void> {
    if (permissionIds.length === 0) return;
    const count = await this.permissions.countBy({ id: In(permissionIds), active: true });
    if (count !== permissionIds.length) {
      throw new DomainError('IAM_PERMISSION_INVALID', '包含不存在或已停用的权限');
    }
  }

  private normalizeDescription(description: string | null | undefined): string | null {
    const normalized = description?.trim();
    return normalized ? normalized : null;
  }
}
