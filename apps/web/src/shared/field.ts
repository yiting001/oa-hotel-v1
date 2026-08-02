import { formatDate, formatDateTime, formatMoney } from './format';

export const fieldLabels: Record<string, string> = {
  number: '单据编号',
  title: '标题',
  requestedAt: '请示时间',
  amountCents: '金额',
  content: '业务内容',
  signingDepartmentId: '签约部门',
  signingDate: '签约日期',
  name: '名称',
  counterpartyFullName: '对方单位全称',
  contentReason: '内容及理由',
  needsSeal: '需要用印',
  project: '付款项目',
  contractStartDate: '合同开始日期',
  contractEndDate: '合同结束日期',
  contractSigningDate: '合同签订日期',
  contractAmountCents: '合同金额',
  budgetAmountCents: '预算金额',
  budgetExecutedCents: '预算累计执行金额',
  accountingSubject: '会计科目',
  maintenanceEstimateCents: '保修期后预计费用',
  plannedPaymentCount: '合同约定付款次数',
  paymentSequence: '本次付款序次',
  executedAmountCents: '累计已执行金额',
  remainingAmountCents: '未执行金额',
  plannedProgress: '合同约定进度',
  actualProgress: '实际进度',
  progressVariance: '进度差',
  paymentMethod: '付款方式',
  paymentReason: '付款原因',
  invoiceNumber: '票据号码',
  warrantyStartDate: '保修开始日期',
  warrantyEndDate: '保修结束日期',
  paymentAmountCents: '本次付款金额',
  paymentAmountUppercase: '本次付款金额大写',
  applicationDate: '申请日期',
  useDate: '使用日期',
  plannedReturnDate: '计划归还日期',
  companionIds: '陪同人',
  destination: '前往地点',
  sealAssetIds: '印章证照',
  purpose: '用途',
  executionStatus: '执行状态',
  actualRecipient: '实际领用人',
  checkedOutAt: '领用时间',
  returnedAt: '归还时间',
  returnCondition: '归还状态',
  exceptionNote: '异常说明',
  stampedCopies: '盖章份数',
  executedAt: '执行时间',
  archiveNumber: '归档号',
  executionNote: '执行备注',
  taxableUnitPriceTotalCents: '含税单价合计',
  taxableAmountTotalCents: '含税金额合计',
  contactUserId: '联系人',
  issueStatus: '发放状态',
  issuedAt: '实发时间',
  issuedBy: '实发人',
  itemCode: '货物编号',
  brand: '品牌',
  specification: '规格型号',
  unit: '单位',
  requestedQuantity: '申请数量',
  monthlyConsumption: '月消耗数量',
  referenceUnitPriceCents: '参考单价',
  remark: '备注',
  issuedQuantity: '实发数量',
};

const paymentMethodLabels: Record<string, string> = {
  CASH: '现金',
  CHEQUE: '支票',
  BANK_ACCEPTANCE: '银行承兑汇票',
  OTHER: '其他',
};

const statusLabels: Record<string, string> = {
  NOT_CHECKED_OUT: '待领用',
  CHECKED_OUT: '已领用',
  RETURNED: '已归还',
  RETURNED_WITH_EXCEPTION: '异常归还',
  NOT_EXECUTED: '待执行',
  EXECUTED: '已执行',
  NOT_ISSUED: '待发放',
  PARTIALLY_ISSUED: '部分发放',
  ISSUED: '已发放',
};

export const hiddenDetailFields = new Set([
  'id',
  'applicantId',
  'departmentId',
  'requestId',
  'contractId',
  'materialItemId',
  'attachments',
  'items',
  'createdAt',
  'updatedAt',
]);

export function formatFieldValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (key.endsWith('Cents') && typeof value === 'number') {
    return formatMoney(value);
  }
  if (key.endsWith('At') && typeof value === 'string') {
    return formatDateTime(value);
  }
  if (key.endsWith('Date') && typeof value === 'string') {
    return formatDate(value);
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  if (Array.isArray(value)) {
    return value.join('、') || '-';
  }
  if (key === 'paymentMethod' && typeof value === 'string') {
    return paymentMethodLabels[value] ?? value;
  }
  if ((key === 'executionStatus' || key === 'issueStatus') && typeof value === 'string') {
    return statusLabels[value] ?? value;
  }
  return String(value);
}
