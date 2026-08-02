import { requiredBusinessModulePermissions } from '@oa/contracts';
import type { RouteRecordRaw } from 'vue-router';
import { PETTY_ROUTE_NAMES } from './petty.config';

const viewPermission = requiredBusinessModulePermissions('PETTY', 'VIEW');
const createPermission = requiredBusinessModulePermissions('PETTY', 'CREATE');

export const pettyRoutes: RouteRecordRaw[] = [
  {
    path: '/petty',
    name: PETTY_ROUTE_NAMES.list,
    component: () => import('./pages/PettyListPage.vue'),
    meta: { title: '零星采买', requiredPermissions: viewPermission },
  },
  {
    path: '/petty/requests/new',
    name: PETTY_ROUTE_NAMES.create,
    component: () => import('./pages/PettyCreatePage.vue'),
    meta: { title: '新建零星采买', requiredPermissions: createPermission },
  },
  {
    path: '/petty/requests/:id/edit',
    name: PETTY_ROUTE_NAMES.edit,
    component: () => import('./pages/PettyEditPage.vue'),
    meta: { title: '零星采买', requiredPermissions: createPermission },
  },
  {
    path: '/system/petty-materials',
    name: PETTY_ROUTE_NAMES.materials,
    component: () => import('./pages/PettyMaterialsPage.vue'),
    meta: { title: '零星采买物资库', requiredPermissions: ['IAM_MANAGE'] },
  },
];
