export const INSIGHT_ROUTE_NAMES = {
  documents: 'insight-documents',
  logs: 'insight-logs',
  statistics: 'insight-statistics',
} as const;

export const INSIGHT_API = {
  documents: '/insight/documents',
  operationLogs: '/insight/operation-logs',
  requestLogs: '/insight/request-logs',
  statistics: '/insight/statistics',
} as const;

export const TRACKED_DOCUMENT_TYPE_OPTIONS = [
  { value: 'CONTRACT_APPROVAL', label: '合同审批（HT）' },
  { value: 'PURCHASE_APPROVAL', label: '采购审批（CG）' },
  { value: 'PETTY_PROCUREMENT', label: '零星采买（LX）' },
];
