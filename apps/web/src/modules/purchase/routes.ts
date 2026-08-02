import { requiredBusinessModulePermissions } from '@oa/contracts';
import type { RouteRecordRaw } from 'vue-router';
import { PURCHASE_ROUTE_NAMES } from './purchase.config';

const viewPermission = requiredBusinessModulePermissions('PURCHASE', 'VIEW');
const createPermission = requiredBusinessModulePermissions('PURCHASE', 'CREATE');

export const purchaseRoutes: RouteRecordRaw[] = [
  {
    path: '/purchase',
    name: PURCHASE_ROUTE_NAMES.list,
    component: () => import('./pages/PurchaseListPage.vue'),
    meta: { title: '采购审批', requiredPermissions: viewPermission },
  },
  {
    path: '/purchase/requests/new',
    name: PURCHASE_ROUTE_NAMES.create,
    component: () => import('./pages/PurchaseCreatePage.vue'),
    meta: { title: '新建采购审批', requiredPermissions: createPermission },
  },
  {
    path: '/purchase/requests/:id/edit',
    name: PURCHASE_ROUTE_NAMES.edit,
    component: () => import('./pages/PurchaseEditPage.vue'),
    meta: { title: '采购审批', requiredPermissions: createPermission },
  },
];
