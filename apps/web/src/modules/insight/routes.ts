import type { RouteRecordRaw } from 'vue-router';
import { INSIGHT_ROUTE_NAMES } from './insight.config';

export const insightRoutes: RouteRecordRaw[] = [
  {
    path: '/insight/documents',
    name: INSIGHT_ROUTE_NAMES.documents,
    component: () => import('./pages/DocumentSearchPage.vue'),
    meta: { title: '单据检索', requiredPermissions: ['DOCUMENT_VIEW'] },
  },
  {
    path: '/insight/logs',
    name: INSIGHT_ROUTE_NAMES.logs,
    component: () => import('./pages/OperationLogPage.vue'),
    meta: { title: '操作日志', requiredPermissions: ['IAM_MANAGE'] },
  },
  {
    path: '/insight/statistics',
    name: INSIGHT_ROUTE_NAMES.statistics,
    component: () => import('./pages/StatisticsPage.vue'),
    meta: { title: '统计看板', requiredPermissions: ['IAM_MANAGE'] },
  },
];
