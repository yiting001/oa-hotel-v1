/** 标准 RBAC 菜单模型：菜单为数据库树形结构（目录/菜单），角色通过菜单树勾选正向授权。 */

export type MenuType = 'DIR' | 'MENU';

export interface MenuNode {
  id: string;
  parentId: string | null;
  name: string;
  type: MenuType;
  /** 前端路由地址，目录为空 */
  path: string | null;
  /** 访问该菜单所需的功能权限标识，多个用英文逗号分隔（全部满足才可见），如 DOCUMENT_VIEW,CONTRACT_VIEW */
  permissionCode: string | null;
  /** Element Plus 图标名称 */
  icon: string | null;
  orderNum: number;
  visible: boolean;
  active: boolean;
}

export interface MenuTreeNode extends MenuNode {
  children: MenuTreeNode[];
}

export interface MenuInput {
  parentId: string | null;
  name: string;
  type: MenuType;
  path: string | null;
  permissionCode: string | null;
  icon: string | null;
  orderNum: number;
  visible: boolean;
  active: boolean;
}

export interface RoleMenuAssignment {
  roleId: string;
  roleCode: string;
  roleName: string;
  active: boolean;
  menuIds: string[];
}

/** 默认菜单种子数据：迁移时写入 iam_menus，可在菜单管理中增删改。 */
export const DEFAULT_MENUS: readonly MenuNode[] = [
  {
    id: 'menu-office',
    parentId: null,
    name: '办公台',
    type: 'DIR',
    path: null,
    permissionCode: null,
    icon: 'Monitor',
    orderNum: 1,
    visible: true,
    active: true,
  },
  {
    id: 'menu-business',
    parentId: null,
    name: '业务中心',
    type: 'DIR',
    path: null,
    permissionCode: null,
    icon: 'Suitcase',
    orderNum: 2,
    visible: true,
    active: true,
  },
  {
    id: 'menu-insight',
    parentId: null,
    name: '运营分析',
    type: 'DIR',
    path: null,
    permissionCode: null,
    icon: 'TrendCharts',
    orderNum: 3,
    visible: true,
    active: true,
  },
  {
    id: 'menu-platform',
    parentId: null,
    name: '系统设置',
    type: 'DIR',
    path: null,
    permissionCode: null,
    icon: 'Setting',
    orderNum: 4,
    visible: true,
    active: true,
  },
  {
    id: 'menu-portal',
    parentId: 'menu-office',
    name: '公司门户',
    type: 'MENU',
    path: '/',
    permissionCode: 'PORTAL_VIEW,CONTENT_VIEW',
    icon: 'House',
    orderNum: 1,
    visible: true,
    active: true,
  },
  {
    id: 'menu-workbench',
    parentId: 'menu-office',
    name: '个人工作台',
    type: 'MENU',
    path: '/workbench',
    permissionCode: null,
    icon: 'DataBoard',
    orderNum: 2,
    visible: true,
    active: true,
  },
  {
    id: 'menu-approval',
    parentId: 'menu-office',
    name: '审批中心',
    type: 'MENU',
    path: '/workbench?tab=pending',
    permissionCode: 'WORKFLOW_APPROVE',
    icon: 'Checked',
    orderNum: 3,
    visible: true,
    active: true,
  },
  {
    id: 'menu-contract',
    parentId: 'menu-business',
    name: '合同与支出',
    type: 'MENU',
    path: '/contract',
    permissionCode: 'DOCUMENT_VIEW,CONTRACT_VIEW',
    icon: 'Tickets',
    orderNum: 1,
    visible: true,
    active: true,
  },
  {
    id: 'menu-purchase',
    parentId: 'menu-business',
    name: '采购审批',
    type: 'MENU',
    path: '/purchase',
    permissionCode: 'DOCUMENT_VIEW,PURCHASE_VIEW',
    icon: 'ShoppingCart',
    orderNum: 2,
    visible: true,
    active: true,
  },
  {
    id: 'menu-petty',
    parentId: 'menu-business',
    name: '零星采买',
    type: 'MENU',
    path: '/petty',
    permissionCode: 'DOCUMENT_VIEW,PETTY_VIEW',
    icon: 'ShoppingCart',
    orderNum: 3,
    visible: true,
    active: true,
  },
  {
    id: 'menu-seal',
    parentId: 'menu-business',
    name: '行政印章',
    type: 'MENU',
    path: '/seal',
    permissionCode: 'DOCUMENT_VIEW,SEAL_VIEW',
    icon: 'Stamp',
    orderNum: 4,
    visible: true,
    active: true,
  },
  {
    id: 'menu-supply',
    parentId: 'menu-business',
    name: '物资管理',
    type: 'MENU',
    path: '/supply',
    permissionCode: 'DOCUMENT_VIEW,SUPPLY_VIEW',
    icon: 'Box',
    orderNum: 5,
    visible: true,
    active: true,
  },
  {
    id: 'menu-insight-documents',
    parentId: 'menu-insight',
    name: '单据检索',
    type: 'MENU',
    path: '/insight/documents',
    permissionCode: 'DOCUMENT_VIEW',
    icon: 'Tickets',
    orderNum: 1,
    visible: true,
    active: true,
  },
  {
    id: 'menu-insight-logs',
    parentId: 'menu-platform',
    name: '操作日志',
    type: 'MENU',
    path: '/insight/logs',
    permissionCode: 'IAM_MANAGE',
    icon: 'DocumentCopy',
    orderNum: 5,
    visible: true,
    active: true,
  },
  {
    id: 'menu-insight-statistics',
    parentId: 'menu-insight',
    name: '统计看板',
    type: 'MENU',
    path: '/insight/statistics',
    permissionCode: 'IAM_MANAGE',
    icon: 'DataBoard',
    orderNum: 2,
    visible: true,
    active: true,
  },
  {
    id: 'menu-content',
    parentId: 'menu-business',
    name: '内容管理',
    type: 'MENU',
    path: '/portal/content-management',
    permissionCode: 'CONTENT_MANAGE',
    icon: 'DocumentCopy',
    orderNum: 6,
    visible: true,
    active: true,
  },
  {
    id: 'menu-iam',
    parentId: 'menu-platform',
    name: '组织与权限',
    type: 'MENU',
    path: '/system/iam',
    permissionCode: 'IAM_VIEW',
    icon: 'OfficeBuilding',
    orderNum: 1,
    visible: true,
    active: true,
  },
  {
    id: 'menu-menus',
    parentId: 'menu-platform',
    name: '菜单管理',
    type: 'MENU',
    path: '/system/menus',
    permissionCode: 'IAM_MANAGE',
    icon: 'Menu',
    orderNum: 2,
    visible: true,
    active: true,
  },
  {
    id: 'menu-petty-materials',
    parentId: 'menu-business',
    name: '零星采买物资库',
    type: 'MENU',
    path: '/system/petty-materials',
    permissionCode: 'IAM_MANAGE',
    icon: 'Box',
    orderNum: 7,
    visible: true,
    active: true,
  },
  {
    id: 'menu-processes',
    parentId: 'menu-platform',
    name: '审批流程设计',
    type: 'MENU',
    path: '/system/processes',
    permissionCode: 'PROCESS_DESIGN_VIEW',
    icon: 'Share',
    orderNum: 3,
    visible: true,
    active: true,
  },
  {
    id: 'menu-approval-chains',
    parentId: 'menu-platform',
    name: '审批链路配置',
    type: 'MENU',
    path: '/system/approval-chains',
    permissionCode: 'PROCESS_DESIGN_VIEW',
    icon: 'Connection',
    orderNum: 4,
    visible: true,
    active: true,
  },
  {
    id: 'menu-forms',
    parentId: 'menu-platform',
    name: 'A4 表单设计',
    type: 'MENU',
    path: '/system/forms',
    permissionCode: 'FORM_DESIGN_VIEW',
    icon: 'Grid',
    orderNum: 6,
    visible: true,
    active: true,
  },
];

export function buildMenuTree(menus: readonly MenuNode[]): MenuTreeNode[] {
  const nodes = new Map<string, MenuTreeNode>();
  for (const menu of menus) nodes.set(menu.id, { ...menu, children: [] });
  const roots: MenuTreeNode[] = [];
  const sorted = [...nodes.values()].sort((left, right) => left.orderNum - right.orderNum);
  for (const node of sorted) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}
