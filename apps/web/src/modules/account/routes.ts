import type { RouteRecordRaw } from 'vue-router';
import { accountSecurityRouteName } from './account-security.policy';

export const accountRoutes: RouteRecordRaw[] = [
  {
    path: '/account/security',
    name: accountSecurityRouteName,
    component: () => import('./pages/AccountSecurityPage.vue'),
    meta: { title: '账号安全' },
  },
];
