import { requiredBusinessModulePermissions } from '@oa/contracts';
import type { RouteRecordRaw } from 'vue-router';

const viewPermission = requiredBusinessModulePermissions('SEAL', 'VIEW');
const createPermission = requiredBusinessModulePermissions('SEAL', 'CREATE');

export const sealRoutes: RouteRecordRaw[] = [
  {
    path: '/seal',
    name: 'seal-workspace',
    component: () => import('./SealWorkspacePage.vue'),
    props: { scope: 'seal' },
    meta: { title: '印章申请', requiredPermissions: viewPermission },
  },
  {
    path: '/seal/licenses',
    name: 'seal-license-workspace',
    component: () => import('./SealWorkspacePage.vue'),
    props: { scope: 'license' },
    meta: { title: '证照申请', requiredPermissions: viewPermission },
  },
  {
    path: '/seal/borrow/new',
    name: 'seal-borrow-create',
    component: () => import('./SealBorrowCreatePage.vue'),
    meta: { title: '新建证照借用申请', requiredPermissions: createPermission, navigationPath: '/seal/licenses' },
  },
  {
    path: '/seal/borrow/:id/edit',
    name: 'seal-borrow-edit',
    component: () => import('./SealBorrowEditPage.vue'),
    meta: { title: '证照借用申请', requiredPermissions: createPermission, navigationPath: '/seal/licenses' },
  },
  {
    path: '/seal/use/new',
    name: 'seal-use-create',
    component: () => import('./SealUseCreatePage.vue'),
    meta: { title: '新建印章使用申请', requiredPermissions: createPermission, navigationPath: '/seal' },
  },
  {
    path: '/seal/use/:id/edit',
    name: 'seal-use-edit',
    component: () => import('./SealUseEditPage.vue'),
    meta: { title: '印章使用申请', requiredPermissions: createPermission, navigationPath: '/seal' },
  },
  {
    path: '/seal/execution/:documentType/:id',
    name: 'seal-execution',
    component: () => import('./SealExecutionPage.vue'),
    meta: { title: '印章执行登记', requiredPermissions: [...viewPermission, 'SEAL_EXECUTE'], navigationPath: '/seal' },
  },
];
