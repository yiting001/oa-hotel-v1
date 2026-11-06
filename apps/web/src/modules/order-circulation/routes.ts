import { requiredBusinessModulePermissions } from '@oa/contracts';
import type { RouteRecordRaw } from 'vue-router';
import { ORDER_CIRCULATION_ROUTE_NAMES } from './order-circulation.config';

const viewPermission = requiredBusinessModulePermissions('ORDER_CIRCULATION', 'VIEW');
const createPermission = requiredBusinessModulePermissions('ORDER_CIRCULATION', 'CREATE');

export const orderCirculationRoutes: RouteRecordRaw[] = [
  {
    path: '/order-circulation',
    name: ORDER_CIRCULATION_ROUTE_NAMES.list,
    component: () => import('./pages/OrderCirculationListPage.vue'),
    meta: { title: '订单流转', requiredPermissions: viewPermission },
  },
  {
    path: '/order-circulation/requests/new',
    name: ORDER_CIRCULATION_ROUTE_NAMES.create,
    component: () => import('./pages/OrderCirculationCreatePage.vue'),
    meta: { title: '新建订单流转', requiredPermissions: createPermission },
  },
  {
    path: '/order-circulation/requests/:id/edit',
    name: ORDER_CIRCULATION_ROUTE_NAMES.edit,
    component: () => import('./pages/OrderCirculationEditPage.vue'),
    meta: { title: '订单流转', requiredPermissions: createPermission },
  },
];
