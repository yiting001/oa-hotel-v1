import { requiredBusinessModulePermissions } from '@oa/contracts';
import type { RouteRecordRaw } from 'vue-router';
import { CONTRACT_ROUTE_NAMES } from './contract.config';

const viewPermission = requiredBusinessModulePermissions('CONTRACT', 'VIEW');
const createPermission = requiredBusinessModulePermissions('CONTRACT', 'CREATE');

export const contractRoutes: RouteRecordRaw[] = [
  {
    path: '/contract',
    redirect: { name: CONTRACT_ROUTE_NAMES.requests },
  },
  {
    path: '/requests',
    name: CONTRACT_ROUTE_NAMES.requests,
    component: () => import('./pages/ContractListPage.vue'),
    meta: {
      title: '请示批复',
      requiredPermissions: viewPermission,
      listDocumentTypes: ['CONTRACT_REQUEST'],
    },
  },
  {
    path: '/contract-approvals',
    name: CONTRACT_ROUTE_NAMES.approvals,
    component: () => import('./pages/ContractListPage.vue'),
    meta: {
      title: '合同审批',
      requiredPermissions: viewPermission,
      listDocumentTypes: ['CONTRACT_APPROVAL', 'CONTRACT_PAYMENT'],
    },
  },
  {
    path: '/contract/requests/new',
    name: CONTRACT_ROUTE_NAMES.requestCreate,
    component: () => import('./pages/ContractRequestCreatePage.vue'),
    meta: { title: '新建合同/支出请示', requiredPermissions: createPermission },
  },
  {
    path: '/contract/requests/:id/edit',
    name: CONTRACT_ROUTE_NAMES.requestEdit,
    component: () => import('./pages/ContractRequestEditPage.vue'),
    meta: { title: '合同/支出请示', requiredPermissions: createPermission },
  },
  {
    path: '/contract/approvals/new',
    name: CONTRACT_ROUTE_NAMES.approvalCreate,
    component: () => import('./pages/ContractApprovalCreatePage.vue'),
    meta: { title: '新建合同审批', requiredPermissions: createPermission },
  },
  {
    path: '/contract/approvals/:id/edit',
    name: CONTRACT_ROUTE_NAMES.approvalEdit,
    component: () => import('./pages/ContractApprovalEditPage.vue'),
    meta: { title: '合同审批', requiredPermissions: createPermission },
  },
  {
    path: '/contract/payments/new',
    name: CONTRACT_ROUTE_NAMES.paymentCreate,
    component: () => import('./pages/ContractPaymentCreatePage.vue'),
    meta: { title: '新建合同付款', requiredPermissions: createPermission },
  },
  {
    path: '/contract/payments/:id/edit',
    name: CONTRACT_ROUTE_NAMES.paymentEdit,
    component: () => import('./pages/ContractPaymentEditPage.vue'),
    meta: { title: '合同付款', requiredPermissions: createPermission },
  },
];
