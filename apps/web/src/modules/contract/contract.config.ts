import type { DocumentStatus, DocumentType } from '@oa/contracts';

export const CONTRACT_ROUTE_NAMES = {
  list: 'contract-list',
  requestCreate: 'contract-request-create',
  requestEdit: 'contract-request-edit',
  approvalCreate: 'contract-approval-create',
  approvalEdit: 'contract-approval-edit',
  paymentCreate: 'contract-payment-create',
  paymentEdit: 'contract-payment-edit',
} as const;

export const CONTRACT_API = {
  requests: '/contracts/requests',
  request: (id: string) => `/contracts/requests/${id}`,
  approvals: '/contracts',
  approval: (id: string) => `/contracts/${id}`,
  approvedContracts: '/contracts/approved',
  payments: '/contracts/payments',
  payment: (id: string) => `/contracts/payments/${id}`,
  submit: (id: string) => `/workflow/documents/${id}/submit`,
} as const;

export const CONTRACT_DOCUMENT_TYPES: DocumentType[] = [
  'CONTRACT_REQUEST',
  'CONTRACT_APPROVAL',
  'CONTRACT_PAYMENT',
];

export const CONTRACT_TYPE_OPTIONS: Array<{ label: string; value: DocumentType }> = [
  { label: '合同/支出请示', value: 'CONTRACT_REQUEST' },
  { label: '合同审批', value: 'CONTRACT_APPROVAL' },
  { label: '合同付款', value: 'CONTRACT_PAYMENT' },
];

export const DOCUMENT_STATUS_OPTIONS: Array<{ label: string; value: DocumentStatus }> = [
  { label: '草稿', value: 'DRAFT' },
  { label: '审批中', value: 'IN_REVIEW' },
  { label: '已退回', value: 'RETURNED' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已取消', value: 'CANCELLED' },
];

export const PAYMENT_METHOD_OPTIONS = [
  { label: '现金', value: 'CASH' },
  { label: '支票', value: 'CHEQUE' },
  { label: '银行承兑汇票', value: 'BANK_ACCEPTANCE' },
  { label: '其它', value: 'OTHER' },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHOD_OPTIONS)[number]['value'];

export const PAYMENT_METHODS_REQUIRING_INSTRUMENT_NUMBER: PaymentMethod[] = [
  'CHEQUE',
  'BANK_ACCEPTANCE',
];

export const EDITABLE_DOCUMENT_STATUSES: DocumentStatus[] = ['DRAFT', 'RETURNED'];
