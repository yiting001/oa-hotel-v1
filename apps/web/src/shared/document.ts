import { WORKFLOW_ROLE_LABELS, type DocumentStatus, type DocumentType } from '@oa/contracts';

export interface DocumentTypeMeta {
  label: string;
  moduleLabel: string;
  createPath: string;
  apiPath: (id: string) => string;
}

export const documentTypeMeta: Record<DocumentType, DocumentTypeMeta> = {
  CONTRACT_REQUEST: {
    label: '请示',
    moduleLabel: '请示批复',
    createPath: '/contract/requests/new',
    apiPath: (id) => `/contracts/requests/${id}`,
  },
  CONTRACT_APPROVAL: {
    label: '合同审批',
    moduleLabel: '合同支出',
    createPath: '/contract/approvals/new',
    apiPath: (id) => `/contracts/${id}`,
  },
  CONTRACT_PAYMENT: {
    label: '合同付款',
    moduleLabel: '合同支出',
    createPath: '/contract/payments/new',
    apiPath: (id) => `/contracts/payments/${id}`,
  },
  SEAL_BORROW: {
    label: '证照借用申请',
    moduleLabel: '证照申请',
    createPath: '/seal/borrow/new',
    apiPath: (id) => `/seals/borrow-requests/${id}`,
  },
  SEAL_USE: {
    label: '印章使用申请',
    moduleLabel: '印章申请',
    createPath: '/seal/use/new',
    apiPath: (id) => `/seals/use-requests/${id}`,
  },
  MATERIAL_PURCHASE: {
    label: '物资申购',
    moduleLabel: '物资管理',
    createPath: '/supply/purchases/new',
    apiPath: (id) => `/supplies/purchase-requests/${id}`,
  },
  MATERIAL_REQUISITION: {
    label: '物资领用',
    moduleLabel: '物资管理',
    createPath: '/supply/requisitions/new',
    apiPath: (id) => `/supplies/requisitions/${id}`,
  },
  PURCHASE_APPROVAL: {
    label: '采购审批',
    moduleLabel: '采购审批',
    createPath: '/purchase/requests/new',
    apiPath: (id) => `/purchases/${id}`,
  },
  PETTY_PROCUREMENT: {
    label: '零星采买',
    moduleLabel: '零星采买',
    createPath: '/petty/requests/new',
    apiPath: (id) => `/petty/procurements/${id}`,
  },
  FOOD_PURCHASE: {
    label: '食材采购',
    moduleLabel: '食材采购',
    createPath: '/food-purchase/requests/new',
    apiPath: (id) => `/food-purchases/${id}`,
  },
  MATERIAL_LOSS: {
    label: '物资报损',
    moduleLabel: '物资报损',
    createPath: '/material-loss/requests/new',
    apiPath: (id) => `/material-losses/${id}`,
  },
  ORDER_CIRCULATION: {
    label: '订单流转',
    moduleLabel: '订单流转',
    createPath: '/order-circulation/requests/new',
    apiPath: (id) => `/order-circulations/${id}`,
  },
};

export const documentStatusMeta: Record<DocumentStatus, { label: string; color: string }> = {
  DRAFT: { label: '草稿', color: 'default' },
  IN_REVIEW: { label: '审批中', color: 'processing' },
  RETURNED: { label: '已退回', color: 'warning' },
  APPROVED: { label: '已通过', color: 'success' },
  CANCELLED: { label: '已取消', color: 'default' },
};

export const roleLabels: Record<string, string> = { ...WORKFLOW_ROLE_LABELS };

export function workflowNodeLabel(value: string): string {
  if (roleLabels[value]) return roleLabels[value];
  return /^[A-Z][A-Z0-9_]*$/.test(value) ? '审批办理' : value;
}

export const approvalActionLabels: Record<string, string> = {
  SUBMIT: '提交审批',
  APPROVE: '同意',
  RETURN: '退回',
};

export function documentDetailPath(documentType: DocumentType, id: string): string {
  return `/documents/${documentType}/${id}`;
}

export function documentEditPath(documentType: DocumentType, id: string): string {
  const routes: Record<DocumentType, string> = {
    CONTRACT_REQUEST: `/contract/requests/${id}/edit`,
    CONTRACT_APPROVAL: `/contract/approvals/${id}/edit`,
    CONTRACT_PAYMENT: `/contract/payments/${id}/edit`,
    SEAL_BORROW: `/seal/borrow/${id}/edit`,
    SEAL_USE: `/seal/use/${id}/edit`,
    MATERIAL_PURCHASE: `/supply/purchases/${id}/edit`,
    MATERIAL_REQUISITION: `/supply/requisitions/${id}/edit`,
    PURCHASE_APPROVAL: `/purchase/requests/${id}/edit`,
    PETTY_PROCUREMENT: `/petty/requests/${id}/edit`,
    FOOD_PURCHASE: `/food-purchase/requests/${id}/edit`,
    MATERIAL_LOSS: `/material-loss/requests/${id}/edit`,
    ORDER_CIRCULATION: `/order-circulation/requests/${id}/edit`,
  };
  return routes[documentType];
}
