import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MENU_IDS, type RoleMenuConfig, type SessionUser } from '@oa/contracts';
import { In, Repository } from 'typeorm';
import { DomainError } from '../../errors/domain-error';
import { RoleHiddenMenuEntity } from '../infrastructure/role-hidden-menu.entity';
import { RoleEntity } from '../infrastructure/role.entity';

const SYSTEM_ADMIN_CODE = 'SYSTEM_ADMIN';

/** 菜单管理：按角色配置菜单可见性，默认全部可见，仅存储被隐藏的菜单。 */
@Injectable()
export class IamMenuService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roles: Repository<RoleEntity>,
    @InjectRepository(RoleHiddenMenuEntity)
    private readonly hiddenMenus: Repository<RoleHiddenMenuEntity>,
  ) {}

  async listRoleMenuConfigs(): Promise<RoleMenuConfig[]> {
    const [roles, bindings] = await Promise.all([
      this.roles.find({ order: { code: 'ASC' } }),
      this.hiddenMenus.find(),
    ]);
    const hiddenByRole = new Map<string, string[]>();
    for (const binding of bindings) {
      const list = hiddenByRole.get(binding.roleId) ?? [];
      list.push(binding.menuId);
      hiddenByRole.set(binding.roleId, list);
    }
    return roles.map((role) => ({
      roleId: role.id,
      roleCode: role.code,
      roleName: role.name,
      active: role.active,
      hiddenMenuIds: hiddenByRole.get(role.id) ?? [],
    }));
  }

  async replaceRoleHiddenMenus(roleId: string, menuIds: string[]): Promise<RoleMenuConfig> {
    const role = await this.roles.findOneBy({ id: roleId });
    if (!role) throw new DomainError('IAM_ROLE_NOT_FOUND', '角色不存在');
    const unique = [...new Set(menuIds)];
    const known = new Set(MENU_IDS);
    if (unique.some((menuId) => !known.has(menuId))) {
      throw new DomainError('IAM_MENU_INVALID', '包含未注册的菜单编码');
    }
    if (role.code === SYSTEM_ADMIN_CODE && unique.length > 0) {
      throw new DomainError('SYSTEM_ADMIN_MENUS_PROTECTED', '系统管理员角色的菜单不能被隐藏');
    }
    await this.hiddenMenus.manager.transaction(async (manager) => {
      await manager.getRepository(RoleHiddenMenuEntity).delete({ roleId });
      if (unique.length > 0) {
        await manager
          .getRepository(RoleHiddenMenuEntity)
          .insert(unique.map((menuId) => ({ roleId, menuId })));
      }
    });
    return {
      roleId: role.id,
      roleCode: role.code,
      roleName: role.name,
      active: role.active,
      hiddenMenuIds: unique,
    };
  }

  /** 当前用户被隐藏的菜单：仅当用户所有角色都隐藏该菜单时才隐藏；系统管理员全部可见。 */
  async hiddenMenuIdsForUser(user: SessionUser): Promise<string[]> {
    const roleCodes = user.roleCodes ?? [];
    if (roleCodes.length === 0 || roleCodes.includes(SYSTEM_ADMIN_CODE)) return [];
    const roles = await this.roles.findBy({ code: In(roleCodes) });
    if (roles.length === 0) return [];
    const bindings = await this.hiddenMenus.findBy({ roleId: In(roles.map((role) => role.id)) });
    const hiddenByRole = new Map<string, Set<string>>();
    for (const binding of bindings) {
      const set = hiddenByRole.get(binding.roleId) ?? new Set<string>();
      set.add(binding.menuId);
      hiddenByRole.set(binding.roleId, set);
    }
    const [first, ...rest] = roles;
    let hidden = new Set(hiddenByRole.get(first.id) ?? []);
    for (const role of rest) {
      const next = hiddenByRole.get(role.id) ?? new Set<string>();
      hidden = new Set([...hidden].filter((menuId) => next.has(menuId)));
      if (hidden.size === 0) return [];
    }
    return [...hidden];
  }
}
