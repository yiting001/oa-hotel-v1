import type { CreateFormDefinitionInput } from '../application/form-design.service';
import { REQUEST_REPORT_TEMPLATE } from './request-report.template';

const CONTRACT_APPROVAL_TEMPLATE = {
  code: 'CONTRACT_APPROVAL_FORM',
  name: '合同/协议审批表',
  description: '合同签订前的部门、金额、相对方、合同内容及用印审批凭证。',
  documentType: 'CONTRACT_APPROVAL',
  changeNote: '系统预置 A4 合同/协议审批表',
  schemaJson: {
    systemTemplateRevision: 1,
    schemaVersion: 1,
    layout: 'SECTIONED_FORM',
    title: '合同/协议审批表',
    subtitle: '东方饭店办公自动化审批表',
    fields: [
      { key: 'signingDepartmentId', label: '签约部门', type: 'DEPARTMENT', required: true },
      { key: 'signingDate', label: '签约时间', type: 'DATE', required: true },
      { key: 'name', label: '合同/协议名称', type: 'TEXT', required: true },
      {
        key: 'counterpartyFullName',
        label: '合同/协议对方单位全称',
        type: 'TEXT',
        required: true,
      },
      { key: 'amountCents', label: '金额', type: 'MONEY', required: true },
      { key: 'needsSeal', label: '需要用印', type: 'BOOLEAN', required: true },
      {
        key: 'contentReason',
        label: '合同/协议内容及理由',
        type: 'LONG_TEXT',
        required: true,
      },
      { key: 'attachments', label: '附件', type: 'ATTACHMENTS' },
      { key: 'approvalOpinions', label: '审批意见', type: 'APPROVAL_OPINIONS', readOnly: true },
    ],
  },
  printSchemaJson: {
    systemTemplateRevision: 1,
    schemaVersion: 1,
    paper: a4Paper(),
    typography: printTypography(),
    sections: [
      title('合同/协议审批表'),
      grid([
        [cell('签约部门', 'signingDepartmentId'), cell('签约时间', 'signingDate')],
        [cell('合同/协议名称', 'name', 3)],
        [cell('合同/协议对方单位全称', 'counterpartyFullName', 3)],
        [cell('金额', 'amountCents'), cell('需要用印', 'needsSeal')],
      ]),
      content('合同/协议内容及理由', 'contentReason', 78),
      attachments(),
      opinions(),
    ],
  },
} satisfies CreateFormDefinitionInput;

const CONTRACT_PAYMENT_TEMPLATE = {
  code: 'CONTRACT_PAYMENT_FORM',
  name: '合同/协议支出申请表',
  description: '依据合同履约进度申请付款并形成财务审核、附件和审批意见凭证。',
  documentType: 'CONTRACT_PAYMENT',
  changeNote: '系统预置 A4 合同/协议支出申请表',
  schemaJson: {
    systemTemplateRevision: 1,
    schemaVersion: 1,
    layout: 'SECTIONED_FORM',
    title: '合同/协议支出申请表',
    subtitle: '东方饭店办公自动化审批表',
    fields: paymentFields(),
  },
  printSchemaJson: {
    systemTemplateRevision: 1,
    schemaVersion: 1,
    paper: a4Paper(),
    typography: printTypography(),
    sections: [
      title('合同/协议支出申请表'),
      grid([
        [cell('合同编号', 'number', 3)],
        [cell('合同项目', 'project'), cell('合同开始时间', 'contractStartDate')],
        [cell('预算金额', 'budgetAmountCents'), cell('合同结束时间', 'contractEndDate')],
        [
          cell('预算累计执行金额', 'budgetExecutedCents'),
          cell('合同签订时间', 'contractSigningDate'),
        ],
        [cell('乙方单位（全称）', 'counterpartyFullName'), cell('会计科目', 'accountingSubject')],
        [cell('合同约定付款次数', 'plannedPaymentCount'), cell('本次付款次数', 'paymentSequence')],
        [
          cell('累计已执行合同金额', 'executedAmountCents'),
          cell('未执行合同金额', 'remainingAmountCents'),
        ],
        [cell('合同约定进度', 'plannedProgress'), cell('付款方式', 'paymentMethod')],
        [cell('实际进度', 'actualProgress'), cell('票据号码', 'invoiceNumber')],
        [cell('进度差', 'progressVariance'), cell('保修期限', '$warrantyPeriod')],
        [
          cell('本次付款金额', 'paymentAmountCents'),
          cell('本次付款金额大写', 'paymentAmountUppercase'),
        ],
      ]),
      content('此次付款原因', 'paymentReason', 28),
      attachments(),
      opinions(48),
    ],
  },
} satisfies CreateFormDefinitionInput;

export const CONTRACT_FORM_TEMPLATES: CreateFormDefinitionInput[] = [
  REQUEST_REPORT_TEMPLATE,
  CONTRACT_APPROVAL_TEMPLATE,
  CONTRACT_PAYMENT_TEMPLATE,
];

function paymentFields(): Array<Record<string, unknown>> {
  return [
    { key: 'project', label: '合同项目', type: 'TEXT', required: true },
    { key: 'counterpartyFullName', label: '乙方单位（全称）', type: 'TEXT', required: true },
    { key: 'contractStartDate', label: '合同开始时间', type: 'DATE' },
    { key: 'contractEndDate', label: '合同结束时间', type: 'DATE' },
    { key: 'contractSigningDate', label: '合同签订时间', type: 'DATE' },
    { key: 'budgetAmountCents', label: '预算金额', type: 'MONEY' },
    { key: 'budgetExecutedCents', label: '预算累计执行金额', type: 'MONEY' },
    { key: 'accountingSubject', label: '会计科目', type: 'TEXT' },
    { key: 'plannedPaymentCount', label: '合同约定付款次数', type: 'INTEGER' },
    { key: 'paymentSequence', label: '本次付款次数', type: 'INTEGER' },
    { key: 'executedAmountCents', label: '累计已执行合同金额', type: 'MONEY' },
    { key: 'remainingAmountCents', label: '未执行合同金额', type: 'MONEY' },
    { key: 'plannedProgress', label: '合同约定进度', type: 'DECIMAL' },
    { key: 'actualProgress', label: '实际进度', type: 'DECIMAL' },
    { key: 'progressVariance', label: '进度差', type: 'DECIMAL', readOnly: true },
    { key: 'paymentMethod', label: '付款方式', type: 'TEXT' },
    { key: 'invoiceNumber', label: '票据号码', type: 'TEXT' },
    { key: 'warrantyStartDate', label: '保修开始日期', type: 'DATE' },
    { key: 'warrantyEndDate', label: '保修结束日期', type: 'DATE' },
    { key: 'paymentAmountCents', label: '本次付款金额', type: 'MONEY', required: true },
    { key: 'paymentAmountUppercase', label: '本次付款金额大写', type: 'TEXT', readOnly: true },
    { key: 'paymentReason', label: '此次付款原因', type: 'LONG_TEXT', required: true },
    { key: 'attachments', label: '附件', type: 'ATTACHMENTS' },
    { key: 'approvalOpinions', label: '审批意见', type: 'APPROVAL_OPINIONS', readOnly: true },
  ];
}

function a4Paper() {
  return {
    size: 'A4',
    orientation: 'PORTRAIT',
    widthMm: 210,
    heightMm: 297,
    marginMm: { top: 14, right: 14, bottom: 14, left: 14 },
  };
}

function printTypography() {
  return { fontFamily: 'SimSun, Songti SC, serif', baseFontSizePt: 10.5 };
}

function title(text: string) {
  return { type: 'TITLE', text, fontSizePt: 22, align: 'CENTER' };
}

function grid(rows: Array<Array<Record<string, unknown>>>) {
  return { type: 'GRID', columns: [28, 62, 28, 62], rows };
}

function cell(label: string, field: string, colSpan?: number) {
  return { label, field, ...(colSpan ? { colSpan } : {}) };
}

function content(label: string, field: string, minHeightMm: number) {
  return { type: 'CONTENT', label, field, minHeightMm };
}

function attachments() {
  return { type: 'ATTACHMENTS', label: '附件', field: 'attachments', minHeightMm: 18 };
}

function opinions(minHeightMm = 55) {
  return { type: 'APPROVAL_OPINIONS', label: '审批意见', field: 'approvalOpinions', minHeightMm };
}
