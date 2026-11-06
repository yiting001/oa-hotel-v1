import { requiredBusinessModulePermissions } from '@oa/contracts';
import type { RouteRecordRaw } from 'vue-router';
import { FOOD_PURCHASE_ROUTE_NAMES } from './food-purchase.config';

const viewPermission = requiredBusinessModulePermissions('FOOD_PURCHASE', 'VIEW');
const createPermission = requiredBusinessModulePermissions('FOOD_PURCHASE', 'CREATE');

export const foodPurchaseRoutes: RouteRecordRaw[] = [
  {
    path: '/food-purchase',
    name: FOOD_PURCHASE_ROUTE_NAMES.list,
    component: () => import('./pages/FoodPurchaseListPage.vue'),
    meta: { title: '食材采购', requiredPermissions: viewPermission },
  },
  {
    path: '/food-purchase/requests/new',
    name: FOOD_PURCHASE_ROUTE_NAMES.create,
    component: () => import('./pages/FoodPurchaseCreatePage.vue'),
    meta: { title: '新建食材采购', requiredPermissions: createPermission },
  },
  {
    path: '/food-purchase/requests/:id/edit',
    name: FOOD_PURCHASE_ROUTE_NAMES.edit,
    component: () => import('./pages/FoodPurchaseEditPage.vue'),
    meta: { title: '食材采购', requiredPermissions: createPermission },
  },
];
