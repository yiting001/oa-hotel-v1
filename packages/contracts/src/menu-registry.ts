/** 系统菜单注册表：前后端共享的菜单编码，用于菜单-角色可见性配置（菜单管理）。 */

export interface MenuRegistryItem {
  id: string;
  label: string;
  groupId: string;
  groupLabel: string;
}

export const MENU_REGISTRY: readonly MenuRegistryItem[] = [
  { id: 'portal', label: '公司门户', groupId: 'office', groupLabel: '办公台' },
  { id: 'workbench', label: '个人工作台', groupId: 'office', groupLabel: '办公台' },
  { id: 'approval', label: '审批中心', groupId: 'office', groupLabel: '办公台' },
  { id: 'start', label: '发起申请', groupId: 'office', groupLabel: '办公台' },
  { id: 'contract', label: '合同与支出', groupId: 'business', groupLabel: '业务中心' },
  { id: 'purchase', label: '采购审批', groupId: 'business', groupLabel: '业务中心' },
  { id: 'petty', label: '零星采买', groupId: 'business', groupLabel: '业务中心' },
  { id: 'seal', label: '行政印章', groupId: 'business', groupLabel: '业务中心' },
  { id: 'supply', label: '物资管理', groupId: 'business', groupLabel: '业务中心' },
  { id: 'insight-documents', label: '单据检索', groupId: 'insight', groupLabel: '运营分析' },
  { id: 'insight-logs', label: '操作日志', groupId: 'insight', groupLabel: '运营分析' },
  { id: 'insight-statistics', label: '统计看板', groupId: 'insight', groupLabel: '运营分析' },
  { id: 'content', label: '内容管理', groupId: 'platform', groupLabel: '平台管理' },
  { id: 'iam', label: '组织与权限', groupId: 'platform', groupLabel: '平台管理' },
  { id: 'menus', label: '菜单管理', groupId: 'platform', groupLabel: '平台管理' },
  { id: 'petty-materials', label: '零星采买物资库', groupId: 'platform', groupLabel: '平台管理' },
  { id: 'processes', label: '审批流程设计', groupId: 'platform', groupLabel: '平台管理' },
  { id: 'approval-chains', label: '审批链路配置', groupId: 'platform', groupLabel: '平台管理' },
  { id: 'forms', label: 'A4 表单设计', groupId: 'platform', groupLabel: '平台管理' },
];

export const MENU_IDS: readonly string[] = MENU_REGISTRY.map((item) => item.id);

export interface RoleMenuConfig {
  roleId: string;
  roleCode: string;
  roleName: string;
  active: boolean;
  hiddenMenuIds: string[];
}
