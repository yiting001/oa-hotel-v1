import {
  Box,
  Checked,
  DataBoard,
  DocumentCopy,
  EditPen,
  Grid,
  House,
  Menu,
  OfficeBuilding,
  Share,
  ShoppingCart,
  Stamp,
  Tickets,
} from '@element-plus/icons-vue';
import { requiredBusinessModulePermissions } from '@oa/contracts';
import type { Component } from 'vue';
import {
  portalContentManagePermission,
  portalViewPermissions,
} from '../modules/portal/domain/portal';

export type NavigationItemId =
  | 'portal'
  | 'workbench'
  | 'approval'
  | 'start'
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
  | 'approval-chains'
  | 'forms';

export interface NavigationItem {
  id: NavigationItemId;
  path: string;
  label: string;
  icon: Component;
  requiredPermissions?: readonly string[];
  requiresProcessStarts?: boolean;
}

export interface NavigationGroup {
  id: string;
  label: string;
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
      {
        id: 'start',
        path: '/start',
        label: '发起申请',
        icon: EditPen,
        requiresProcessStarts: true,
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
        id: 'insight-logs',
        path: '/insight/logs',
        label: '操作日志',
        icon: DocumentCopy,
        requiredPermissions: ['IAM_MANAGE'],
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
    label: '平台管理',
    items: [
      {
        id: 'content',
        path: '/portal/content-management',
        label: '内容管理',
        icon: DocumentCopy,
        requiredPermissions: [portalContentManagePermission],
      },
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
        id: 'petty-materials',
        path: '/system/petty-materials',
        label: '零星采买物资库',
        icon: Box,
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
        id: 'approval-chains',
        path: '/system/approval-chains',
        label: '审批链路配置',
        icon: Checked,
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
  hiddenMenuIds: readonly string[] = [],
): NavigationGroup[] {
  const granted = new Set(permissionCodes);
  const hidden = new Set(hiddenMenuIds);
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (hidden.has(item.id)) return false;
        if (item.requiresProcessStarts && processStartCount === 0) return false;
        return (item.requiredPermissions ?? []).every((permission) => granted.has(permission));
      }),
    }))
    .filter((group) => group.items.length > 0);
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
  const primaryIds: NavigationItemId[] = ['portal', 'approval', 'start', 'workbench'];
  const items = groups.flatMap((group) => group.items);
  return primaryIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is NavigationItem => Boolean(item));
}
