import { formatDate, formatDateTime, formatMoney } from './format';

export const fieldLabels: Record<string, string> = {
  number: '单据编号',
  title: '标题',
  requestedAt: '请示时间',
  amountCents: '金额',
  content: '业务内容',
  addressee: '致送',
  issuer: '发出',
  signingDepartmentId: '签约部门',
  signingDate: '签约日期',
  name: '名称',
  counterpartyFullName: '对方单位全称',
  counterpartyContact: '乙方联系人',
  counterpartyPhone: '联系电话',
  validFrom: '合同有效期开始',
  validTo: '合同有效期结束',
  contentReason: '内容及理由',
  sealType: '用印',
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
  counterpartyName: '对方单位名称',
  itemCategory: '物资类别',
  budgetType: '预算类型',
  tariffCents: '关税',
  vatCents: '增值税',
  otherFeesCents: '其他费用',
  handlerName: '经办人',
  supplierA: '供应商一',
  supplierB: '供应商二',
  supplierC: '供应商三',
  requiredDate: '需求日期',
  purchaseOrderNo: '采购订单号',
  paymentReason: '付款原因',
  invoiceNumber: '票据号码',
  warrantyStartDate: '保修开始日期',
  warrantyEndDate: '保修结束日期',
  paymentAmountCents: '本次付款金额',
  paymentAmountUppercase: '本次付款金额大写',
  applicationDate: '申请日期',
  useDate: '使用日期',
  expectedDeliveryDate: '期望到货时间',
  reason: '申请理由及用途',
  quantity: '订购数量',
  plannedReturnDate: '归还日期',
  companionIds: '陪同人',
  destination: '前往地点',
  sealAssetNames: '印章证照',
  submitTo: '报送单位',
  sealCategories: '用章类别及数量',
  sealTakeout: '公章外带',
  licenseTakeout: '证照外带',
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
  code: '编码',
  availableQuantity: '可用数量',
  requestedQuantity: '申请数量',
  monthlyConsumption: '月消耗数量',
  referenceUnitPriceCents: '参考单价',
  remark: '备注',
  issuedQuantity: '实发数量',
  category: '品类',
  unitPriceCents: '单价',
  subtotalCents: '总价',
  totalAmountCents: '合计金额',
  subject: '主题',
  ccRecipients: '抄送人',
  teamName: '班组',
  requirement: '要求',
};

/** 合同审批用印选择：合同章或公章。 */
const sealTypeLabels: Record<string, string> = {
  CONTRACT_SEAL: '合同章',
  OFFICIAL_SEAL: '公章',
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
  // 旧版是否需要用印开关：详情与打印统一展示新的「用印」选择
  'needsSeal',
  'contractId',
  'materialItemId',
  'attachments',
  'items',
  'changeLogs',
  // 审批界面内部标记，不作为业务字段展示
  'canModerate',
  'createdAt',
  'updatedAt',
]);

/**
 * 详情页按单据类型隐藏的字段：已从表单取消或纯技术字段，避免展示英文键与空行。
 */
export const hiddenDetailFieldsByType: Record<string, readonly string[]> = {
  PURCHASE_APPROVAL: [
    'number',
    'amountCents',
    'counterpartyName',
    'counterpartyContact',
    'counterpartyPhone',
    'paymentMethod',
    'itemCategory',
    'budgetType',
    'subtotalCents',
    'tariffCents',
    'vatCents',
    'otherFeesCents',
    'supplierA',
    'supplierB',
    'supplierC',
    'requiredDate',
    'purchaseOrderNo',
    'handlerName',
  ],
};

/** 明细表按单据类型隐藏的列（采购明细现在只保留品名/数量/单位）。 */
export const hiddenItemFieldsByType: Record<string, readonly string[]> = {
  PURCHASE_APPROVAL: ['specification', 'unitPriceCents', 'subtotalCents'],
};

/** 明细表中的技术字段，任何单据都不展示。 */
export const hiddenItemFields = new Set([
  'id',
  'purchaseId',
  'lossId',
  'sortOrder',
  'documentId',
  'contractId',
  'materialItemId',
  'procurementId',
]);

/** 值为空的行不进入详情摘要，避免整页「-」。 */
export function hasDetailValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return false;
  return true;
}

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
    // 抄送人等对象数组只展示姓名，避免 [object Object]；用章类别额外带上份数。
    return (
      value
        .map((entry) => {
          if (typeof entry === 'object' && entry !== null && 'name' in entry) {
            const name = String((entry as { name: unknown }).name);
            const copies = 'copies' in entry ? Number((entry as { copies: unknown }).copies) : NaN;
            return Number.isFinite(copies) && copies > 0 ? `${name} ×${copies}` : name;
          }
          return String(entry);
        })
        .join('、') || '-'
    );
  }
  if (key === 'paymentMethod' && typeof value === 'string') {
    return paymentMethodLabels[value] ?? value;
  }
  if (key === 'sealType' && typeof value === 'string') {
    return sealTypeLabels[value] ?? value;
  }
  if ((key === 'executionStatus' || key === 'issueStatus') && typeof value === 'string') {
    return statusLabels[value] ?? value;
  }
  return String(value);
}
