import { requiredBusinessModulePermissions } from '@oa/contracts';
import type { RouteRecordRaw } from 'vue-router';
import { supplyRouteNames } from './route-names';

const viewPermission = requiredBusinessModulePermissions('SUPPLY', 'VIEW');
const createPermission = requiredBusinessModulePermissions('SUPPLY', 'CREATE');

export const supplyRoutes: RouteRecordRaw[] = [
  {
    path: '/supply',
    name: supplyRouteNames.overview,
    component: () => import('./pages/SupplyOverviewPage.vue'),
    meta: { title: '物资管理', requiredPermissions: viewPermission },
  },
  {
    path: '/supply/purchases/new',
    name: supplyRouteNames.purchaseCreate,
    component: () => import('./pages/PurchaseCreatePage.vue'),
    meta: { title: '新建物资申购', requiredPermissions: createPermission },
  },
  {
    path: '/supply/purchases/:id/edit',
    name: supplyRouteNames.purchaseEdit,
    component: () => import('./pages/PurchaseEditPage.vue'),
    meta: { title: '物资申购', requiredPermissions: createPermission },
  },
  {
    path: '/supply/requisitions/new',
    name: supplyRouteNames.requisitionCreate,
    component: () => import('./pages/RequisitionCreatePage.vue'),
    meta: { title: '新建物资领用', requiredPermissions: createPermission },
  },
  {
    path: '/supply/requisitions/:id/edit',
    name: supplyRouteNames.requisitionEdit,
    component: () => import('./pages/RequisitionEditPage.vue'),
    meta: { title: '物资领用', requiredPermissions: createPermission },
  },
  {
    path: '/supply/issues/:id',
    name: supplyRouteNames.requisitionIssue,
    component: () => import('./pages/RequisitionIssuePage.vue'),
    meta: { title: '物资实发登记', requiredPermissions: [...viewPermission, 'SUPPLY_ISSUE'] },
  },
];
