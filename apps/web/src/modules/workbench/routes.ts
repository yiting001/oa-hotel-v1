import type { RouteRecordRaw } from 'vue-router';

export const workbenchRoutes: RouteRecordRaw[] = [
  {
    path: '/start',
    name: 'process-start',
    component: () => import('./pages/ProcessStartPage.vue'),
    meta: { title: '发起申请', requiredPermission: 'DOCUMENT_CREATE' },
  },
  {
    path: '/workbench',
    name: 'personal-workbench',
    component: () => import('./pages/PersonalWorkbenchPage.vue'),
    meta: { title: '个人工作台' },
  },
  {
    path: '/approval',
    name: 'approval-center',
    component: () => import('./pages/PersonalWorkbenchPage.vue'),
    meta: { title: '审批中心', requiredPermission: 'WORKFLOW_APPROVE' },
  },
];
