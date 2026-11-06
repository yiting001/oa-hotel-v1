import { requiredBusinessModulePermissions } from '@oa/contracts';
import type { RouteRecordRaw } from 'vue-router';
import { MATERIAL_LOSS_ROUTE_NAMES } from './material-loss.config';

const viewPermission = requiredBusinessModulePermissions('MATERIAL_LOSS', 'VIEW');
const createPermission = requiredBusinessModulePermissions('MATERIAL_LOSS', 'CREATE');

export const materialLossRoutes: RouteRecordRaw[] = [
  {
    path: '/material-loss',
    name: MATERIAL_LOSS_ROUTE_NAMES.list,
    component: () => import('./pages/MaterialLossListPage.vue'),
    meta: { title: '物资报损', requiredPermissions: viewPermission },
  },
  {
    path: '/material-loss/requests/new',
    name: MATERIAL_LOSS_ROUTE_NAMES.create,
    component: () => import('./pages/MaterialLossCreatePage.vue'),
    meta: { title: '新建物资报损', requiredPermissions: createPermission },
  },
  {
    path: '/material-loss/requests/:id/edit',
    name: MATERIAL_LOSS_ROUTE_NAMES.edit,
    component: () => import('./pages/MaterialLossEditPage.vue'),
    meta: { title: '物资报损', requiredPermissions: createPermission },
  },
];
