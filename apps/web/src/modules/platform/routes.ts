import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';
import 'element-plus/dist/index.css';
import type { RouteRecordRaw } from 'vue-router';
import './styles/platform.css';

export const platformRouteNames = {
  iam: 'platform-iam',
  processes: 'platform-processes',
  forms: 'platform-forms',
} as const;

export const platformRoutes: RouteRecordRaw[] = [
  {
    path: '/system/iam',
    name: platformRouteNames.iam,
    component: () => import('./pages/IamManagementPage.vue'),
    meta: { title: '组织与权限', requiredPermission: 'IAM_VIEW' },
  },
  {
    path: '/system/processes',
    name: platformRouteNames.processes,
    component: () => import('./pages/ProcessDesignerPage.vue'),
    meta: { title: '审批流程设计', requiredPermission: 'PROCESS_DESIGN_VIEW' },
  },
  {
    path: '/system/forms',
    name: platformRouteNames.forms,
    component: () => import('./pages/FormDesignerPage.vue'),
    meta: { title: 'A4 表单设计', requiredPermission: 'FORM_DESIGN_VIEW' },
  },
];
