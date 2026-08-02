import {
  Box,
  Checked,
  Connection,
  DataBoard,
  DocumentCopy,
  EditPen,
  Grid,
  House,
  Menu,
  Monitor,
  OfficeBuilding,
  Setting,
  Share,
  ShoppingCart,
  Stamp,
  Suitcase,
  Tickets,
  TrendCharts,
} from '@element-plus/icons-vue';
import { requiredBusinessModulePermissions, type MenuTreeNode } from '@oa/contracts';
import type { Component } from 'vue';
import {
  portalContentManagePermission,
  portalViewPermissions,
} from '../modules/portal/domain/portal';

export type NavigationItemId =
  | 'portal'
  | 'workbench'
  | 'approval'
  | 'content'
  | 'contract'
  | 'purchase'
  | 'petty'
  | 'petty-materials'
  | 'insight-documents'
  | 'insight-logs'
  | 'insight-statistics'
  | 'seal'
  | 'supply'
  | 'iam'
  | 'menus'
  | 'processes'
  | 'forms';

export interface NavigationItem {
  id: string;
  path: string;
  label: string;
  icon: Component;
  requiredPermissions?: readonly string[];
  requiresProcessStarts?: boolean;
}

export interface NavigationGroup {
  id: string;
  label: string;
  icon?: Component;
  items: NavigationItem[];
}

const navigationGroups: readonly NavigationGroup[] = [
  {
    id: 'office',
    label: '办公台',
    items: [
      {
        id: 'portal',
        path: '/',
        label: '公司门户',
        icon: House,
        requiredPermissions: portalViewPermissions,
      },
      { id: 'workbench', path: '/workbench', label: '个人工作台', icon: DataBoard },
      {
        id: 'approval',
        path: '/workbench?tab=pending',
        label: '审批中心',
        icon: Checked,
        requiredPermissions: ['WORKFLOW_APPROVE'],
      },
    ],
  },
  {
    id: 'business',
    label: '业务中心',
    items: [
      {
        id: 'contract',
        path: '/contract',
        label: '合同与支出',
        icon: Tickets,
        requiredPermissions: requiredBusinessModulePermissions('CONTRACT', 'VIEW'),
      },
      {
        id: 'purchase',
        path: '/purchase',
        label: '采购审批',
        icon: ShoppingCart,
        requiredPermissions: requiredBusinessModulePermissions('PURCHASE', 'VIEW'),
      },
      {
        id: 'petty',
        path: '/petty',
        label: '零星采买',
        icon: ShoppingCart,
        requiredPermissions: requiredBusinessModulePermissions('PETTY', 'VIEW'),
      },
      {
        id: 'seal',
        path: '/seal',
        label: '行政印章',
        icon: Stamp,
        requiredPermissions: requiredBusinessModulePermissions('SEAL', 'VIEW'),
      },
      {
        id: 'supply',
        path: '/supply',
        label: '物资管理',
        icon: Box,
        requiredPermissions: requiredBusinessModulePermissions('SUPPLY', 'VIEW'),
      },
      {
        id: 'content',
        path: '/portal/content-management',
        label: '内容管理',
        icon: DocumentCopy,
        requiredPermissions: [portalContentManagePermission],
      },
      {
        id: 'petty-materials',
        path: '/system/petty-materials',
        label: '零星采买物资库',
        icon: Box,
        requiredPermissions: ['IAM_MANAGE'],
      },
    ],
  },
  {
    id: 'insight',
    label: '运营分析',
    items: [
      {
        id: 'insight-documents',
        path: '/insight/documents',
        label: '单据检索',
        icon: Tickets,
        requiredPermissions: ['DOCUMENT_VIEW'],
      },
      {
        id: 'insight-statistics',
        path: '/insight/statistics',
        label: '统计看板',
        icon: DataBoard,
        requiredPermissions: ['IAM_MANAGE'],
      },
    ],
  },
  {
    id: 'platform',
    label: '系统设置',
    items: [
      {
        id: 'iam',
        path: '/system/iam',
        label: '组织与权限',
        icon: OfficeBuilding,
        requiredPermissions: ['IAM_VIEW'],
      },
      {
        id: 'menus',
        path: '/system/menus',
        label: '菜单管理',
        icon: Menu,
        requiredPermissions: ['IAM_MANAGE'],
      },
      {
        id: 'insight-logs',
        path: '/insight/logs',
        label: '操作日志',
        icon: DocumentCopy,
        requiredPermissions: ['IAM_MANAGE'],
      },
      {
        id: 'processes',
        path: '/system/processes',
        label: '审批流程设计',
        icon: Share,
        requiredPermissions: ['PROCESS_DESIGN_VIEW'],
      },
      {
        id: 'forms',
        path: '/system/forms',
        label: 'A4 表单设计',
        icon: Grid,
        requiredPermissions: ['FORM_DESIGN_VIEW'],
      },
    ],
  },
];

export function visibleNavigationGroups(
  permissionCodes: readonly string[],
  processStartCount: number,
): NavigationGroup[] {
  const granted = new Set(permissionCodes);
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.requiresProcessStarts && processStartCount === 0) return false;
        return (item.requiredPermissions ?? []).every((permission) => granted.has(permission));
      }),
    }))
    .filter((group) => group.items.length > 0);
}

const menuIconComponents: Record<string, Component> = {
  Box,
  Checked,
  Connection,
  DataBoard,
  DocumentCopy,
  EditPen,
  Grid,
  House,
  Menu,
  Monitor,
  OfficeBuilding,
  Setting,
  Share,
  ShoppingCart,
  Stamp,
  Suitcase,
  Tickets,
  TrendCharts,
};

export function menuIconComponent(icon: string | null): Component {
  return (icon && menuIconComponents[icon]) || Menu;
}

/** 基于服务端下发的菜单树构建导航：菜单授权为主，功能权限作二次过滤。 */
export function navigationGroupsFromMenuTree(
  tree: readonly MenuTreeNode[],
  permissionCodes: readonly string[],
  processStartCount: number,
): NavigationGroup[] {
  const granted = new Set(permissionCodes);
  const toItem = (menu: MenuTreeNode): NavigationItem | null => {
    if (!menu.path) return null;
    if (menu.path === '/start' && processStartCount === 0) return null;
    const required = menu.permissionCode
      ? menu.permissionCode
          .split(',')
          .map((code) => code.trim())
          .filter(Boolean)
      : [];
    if (!required.every((code) => granted.has(code))) return null;
    return {
      id: menu.id.replace(/^menu-/, ''),
      path: menu.path,
      label: menu.name,
      icon: menuIconComponent(menu.icon),
    };
  };
  const groups: NavigationGroup[] = [];
  for (const node of tree) {
    if (node.type === 'DIR') {
      const items = node.children
        .map(toItem)
        .filter((item): item is NavigationItem => item !== null);
      if (items.length > 0) {
        groups.push({
          id: node.id.replace(/^menu-/, ''),
          label: node.name,
          icon: menuIconComponent(node.icon),
          items,
        });
      }
    } else {
      const item = toItem(node);
      if (item) {
        groups.push({
          id: node.id.replace(/^menu-/, ''),
          label: node.name,
          icon: menuIconComponent(node.icon),
          items: [item],
        });
      }
    }
  }
  return groups;
}

export function selectedNavigationPath(
  groups: readonly NavigationGroup[],
  routePath: string,
  workbenchTab: unknown,
): string {
  const items = groups.flatMap((group) => group.items);
  if (
    routePath === '/workbench' &&
    workbenchTab === 'pending' &&
    items.some((item) => item.id === 'approval')
  ) {
    return '/workbench?tab=pending';
  }
  const candidates = items
    .filter((item) => {
      if (item.path.includes('?')) return false;
      const path = item.path.split('?')[0];
      return path === '/'
        ? routePath === '/'
        : routePath === path || routePath.startsWith(`${path}/`);
    })
    .sort((left, right) => right.path.length - left.path.length);
  return candidates[0]?.path ?? '';
}

export function mobilePrimaryNavigation(groups: readonly NavigationGroup[]): NavigationItem[] {
  const primaryIds: string[] = ['portal', 'approval', 'workbench'];
  const items = groups.flatMap((group) => group.items);
  return primaryIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is NavigationItem => Boolean(item));
}
