import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  buildMenuTree,
  type MenuInput,
  type MenuNode,
  type MenuTreeNode,
  type RoleMenuAssignment,
  type SessionUser,
} from '@oa/contracts';
import { In, Repository } from 'typeorm';
import { DomainError } from '../../errors/domain-error';
import { MenuEntity } from '../infrastructure/menu.entity';
import { RoleMenuEntity } from '../infrastructure/role-menu.entity';
import { RoleEntity } from '../infrastructure/role.entity';

const SYSTEM_ADMIN_CODE = 'SYSTEM_ADMIN';

function toMenuNode(entity: MenuEntity): MenuNode {
  return {
    id: entity.id,
    parentId: entity.parentId,
    name: entity.name,
    type: entity.type,
    path: entity.path,
    permissionCode: entity.permissionCode,
    icon: entity.icon,
    orderNum: entity.orderNum,
    visible: entity.visible,
    active: entity.active,
  };
}

/** 标准 RBAC 菜单管理：菜单树 CRUD + 角色-菜单正向授权 + 按用户聚合下发菜单。 */
@Injectable()
export class IamMenuService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roles: Repository<RoleEntity>,
    @InjectRepository(MenuEntity)
    private readonly menus: Repository<MenuEntity>,
    @InjectRepository(RoleMenuEntity)
    private readonly roleMenus: Repository<RoleMenuEntity>,
  ) {}

  async menuTree(): Promise<MenuTreeNode[]> {
    const menus = await this.menus.find({ order: { orderNum: 'ASC' } });
    return buildMenuTree(menus.map(toMenuNode));
  }

  async createMenu(input: MenuInput): Promise<MenuNode> {
    await this.assertValidParent(input, null);
    const entity = this.menus.create({
      id: `menu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      ...input,
    });
    await this.menus.save(entity);
    return toMenuNode(entity);
  }

  async updateMenu(id: string, input: MenuInput): Promise<MenuNode> {
    const entity = await this.menus.findOneBy({ id });
    if (!entity) throw new DomainError('IAM_MENU_NOT_FOUND', '菜单不存在');
    await this.assertValidParent(input, id);
    Object.assign(entity, input);
    await this.menus.save(entity);
    return toMenuNode(entity);
  }

  async deleteMenu(id: string): Promise<void> {
    const entity = await this.menus.findOneBy({ id });
    if (!entity) throw new DomainError('IAM_MENU_NOT_FOUND', '菜单不存在');
    const childCount = await this.menus.countBy({ parentId: id });
    if (childCount > 0) {
      throw new DomainError('IAM_MENU_HAS_CHILDREN', '请先删除该目录下的子菜单');
    }
    await this.menus.manager.transaction(async (manager) => {
      await manager.getRepository(RoleMenuEntity).delete({ menuId: id });
      await manager.getRepository(MenuEntity).delete({ id });
    });
  }

  async listRoleMenuAssignments(): Promise<RoleMenuAssignment[]> {
    const [roles, bindings] = await Promise.all([
      this.roles.find({ order: { code: 'ASC' } }),
      this.roleMenus.find(),
    ]);
    const menuIdsByRole = new Map<string, string[]>();
    for (const binding of bindings) {
      const list = menuIdsByRole.get(binding.roleId) ?? [];
      list.push(binding.menuId);
      menuIdsByRole.set(binding.roleId, list);
    }
    return roles.map((role) => ({
      roleId: role.id,
      roleCode: role.code,
      roleName: role.name,
      active: role.active,
      menuIds: menuIdsByRole.get(role.id) ?? [],
    }));
  }

  async replaceRoleMenus(roleId: string, menuIds: string[]): Promise<RoleMenuAssignment> {
    const role = await this.roles.findOneBy({ id: roleId });
    if (!role) throw new DomainError('IAM_ROLE_NOT_FOUND', '角色不存在');
    if (role.code === SYSTEM_ADMIN_CODE) {
      throw new DomainError('SYSTEM_ADMIN_MENUS_PROTECTED', '系统管理员始终拥有全部菜单');
    }
    const unique = [...new Set(menuIds)];
    if (unique.length > 0) {
      const known = await this.menus.countBy({ id: In(unique) });
      if (known !== unique.length) {
        throw new DomainError('IAM_MENU_INVALID', '包含不存在的菜单');
      }
    }
    await this.roleMenus.manager.transaction(async (manager) => {
      await manager.getRepository(RoleMenuEntity).delete({ roleId });
      if (unique.length > 0) {
        await manager
          .getRepository(RoleMenuEntity)
          .insert(unique.map((menuId) => ({ roleId, menuId })));
      }
    });
    return {
      roleId: role.id,
      roleCode: role.code,
      roleName: role.name,
      active: role.active,
      menuIds: unique,
    };
  }

  /** 新角色默认授予全部菜单，避免其用户无菜单可用；管理员可再收窄。 */
  async grantAllMenusToRole(roleId: string): Promise<void> {
    const menus = await this.menus.find();
    if (menus.length === 0) return;
    await this.roleMenus.manager.transaction(async (manager) => {
      await manager.getRepository(RoleMenuEntity).delete({ roleId });
      await manager
        .getRepository(RoleMenuEntity)
        .insert(menus.map((menu) => ({ roleId, menuId: menu.id })));
    });
  }

  /** 当前用户可见菜单树：多角色取并集；系统管理员拥有全部；仅返回显示且启用的节点。 */
  async menuTreeForUser(user: SessionUser): Promise<MenuTreeNode[]> {
    const menus = await this.menus.find({ order: { orderNum: 'ASC' } });
    const enabled = menus.filter((menu) => menu.visible && menu.active).map(toMenuNode);
    const roleCodes = user.roleCodes ?? [];
    if (roleCodes.includes(SYSTEM_ADMIN_CODE)) return buildMenuTree(enabled);
    if (roleCodes.length === 0) return [];
    const roles = await this.roles.findBy({ code: In(roleCodes) });
    if (roles.length === 0) return [];
    const bindings = await this.roleMenus.findBy({ roleId: In(roles.map((role) => role.id)) });
    const grantedIds = new Set(bindings.map((binding) => binding.menuId));
    const byId = new Map(enabled.map((menu) => [menu.id, menu]));
    const included = new Set<string>();
    for (const menu of enabled) {
      if (!grantedIds.has(menu.id) || menu.type !== 'MENU') continue;
      included.add(menu.id);
      let parentId = menu.parentId;
      while (parentId) {
        const parent = byId.get(parentId);
        if (!parent || included.has(parent.id)) break;
        included.add(parent.id);
        parentId = parent.parentId;
      }
    }
    return buildMenuTree(enabled.filter((menu) => included.has(menu.id)));
  }

  private async assertValidParent(input: MenuInput, selfId: string | null): Promise<void> {
    if (!input.parentId) return;
    if (selfId && input.parentId === selfId) {
      throw new DomainError('IAM_MENU_PARENT_INVALID', '上级菜单不能是自身');
    }
    const parent = await this.menus.findOneBy({ id: input.parentId });
    if (!parent) throw new DomainError('IAM_MENU_PARENT_INVALID', '上级菜单不存在');
    if (parent.type !== 'DIR') {
      throw new DomainError('IAM_MENU_PARENT_INVALID', '上级菜单必须是目录');
    }
  }
}
