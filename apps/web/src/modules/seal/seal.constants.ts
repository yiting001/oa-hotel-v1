export const sealDocumentTypeOptions = [
  { label: '印章证照外借', value: 'SEAL_BORROW' },
  { label: '印章证照使用', value: 'SEAL_USE' },
] as const;

export const sealDocumentStatusOptions = [
  { label: '草稿', value: 'DRAFT' },
  { label: '审批中', value: 'IN_REVIEW' },
  { label: '已退回', value: 'RETURNED' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已取消', value: 'CANCELLED' },
] as const;

export const sealAssetTypeOptions = [
  { label: '印章', value: 'SEAL' },
  { label: '证照', value: 'LICENSE' },
] as const;

export const sealAssetTypeLabels: Record<string, string> = {
  SEAL: '印章',
  LICENSE: '证照',
};

export const sealAssetStatusOptions = [
  { label: '可用', value: 'AVAILABLE' },
  { label: '外借中', value: 'BORROWED' },
] as const;

export const sealAssetStatusMeta: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: '可用', color: 'success' },
  BORROWED: { label: '外借中', color: 'warning' },
};

export const sealExecutionStatusMeta: Record<string, { label: string; color: string }> = {
  NOT_CHECKED_OUT: { label: '待领用', color: 'processing' },
  CHECKED_OUT: { label: '已领用', color: 'warning' },
  RETURNED: { label: '已归还', color: 'success' },
  RETURNED_WITH_EXCEPTION: { label: '异常归还', color: 'error' },
  NOT_EXECUTED: { label: '待用印', color: 'processing' },
  EXECUTED: { label: '已用印', color: 'success' },
};

export function getAssetStatusMeta(status: string): { label: string; color: string } {
  return sealAssetStatusMeta[status] ?? { label: status, color: 'default' };
}

export function getExecutionStatusMeta(status: string): { label: string; color: string } {
  return sealExecutionStatusMeta[status] ?? { label: status, color: 'default' };
}
