import { requiredBusinessModulePermissions } from '@oa/contracts';
import type { RouteRecordRaw } from 'vue-router';

const viewPermission = requiredBusinessModulePermissions('SEAL', 'VIEW');
const createPermission = requiredBusinessModulePermissions('SEAL', 'CREATE');

export const sealRoutes: RouteRecordRaw[] = [
  {
    path: '/seal',
    name: 'seal-workspace',
    component: () => import('./SealWorkspacePage.vue'),
    meta: { title: '行政印章', requiredPermissions: viewPermission },
  },
  {
    path: '/seal/borrow/new',
    name: 'seal-borrow-create',
    component: () => import('./SealBorrowCreatePage.vue'),
    meta: { title: '新建外借申请', requiredPermissions: createPermission },
  },
  {
    path: '/seal/borrow/:id/edit',
    name: 'seal-borrow-edit',
    component: () => import('./SealBorrowEditPage.vue'),
    meta: { title: '外借申请', requiredPermissions: createPermission },
  },
  {
    path: '/seal/use/new',
    name: 'seal-use-create',
    component: () => import('./SealUseCreatePage.vue'),
    meta: { title: '新建用印申请', requiredPermissions: createPermission },
  },
  {
    path: '/seal/use/:id/edit',
    name: 'seal-use-edit',
    component: () => import('./SealUseEditPage.vue'),
    meta: { title: '用印申请', requiredPermissions: createPermission },
  },
  {
    path: '/seal/execution/:documentType/:id',
    name: 'seal-execution',
    component: () => import('./SealExecutionPage.vue'),
    meta: { title: '印章执行登记', requiredPermissions: [...viewPermission, 'SEAL_EXECUTE'] },
  },
];
