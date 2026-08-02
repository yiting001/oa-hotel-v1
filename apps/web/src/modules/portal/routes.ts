import type { RouteRecordRaw } from 'vue-router';
import { portalContentManagePermission, portalViewPermissions } from './domain/portal';

export const portalRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'company-portal',
    component: () => import('./pages/PortalPage.vue'),
    meta: { title: '公司门户', requiredPermissions: [...portalViewPermissions] },
  },
  {
    path: '/portal/content-management',
    name: 'portal-content-management',
    component: () => import('./pages/PortalContentManagementPage.vue'),
    meta: { title: '内容管理', requiredPermissions: [portalContentManagePermission] },
  },
];
