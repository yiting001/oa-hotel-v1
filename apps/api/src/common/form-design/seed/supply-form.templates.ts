import type { CreateFormDefinitionInput } from '../application/form-design.service';

const MATERIAL_PURCHASE_TEMPLATE = {
  code: 'MATERIAL_PURCHASE_FORM',
  name: '物资申购单',
  description: '记录申购部门、申购人、物资明细、参考价格、汇总金额和审批意见。',
  documentType: 'MATERIAL_PURCHASE',
  changeNote: '系统预置 A4 物资申购单',
  schemaJson: {
    systemTemplateRevision: 1,
    schemaVersion: 1,
    layout: 'DETAIL_TABLE_FORM',
    title: '物资申购单',
    subtitle: '东方饭店办公自动化审批表',
    fields: [
      field('applicantId', '申购人', 'USER', true),
      field('departmentId', '申购部门', 'DEPARTMENT', true),
      field('applicationDate', '申购日期', 'DATE', true),
      {
        key: 'items',
        label: '申购明细',
        type: 'DETAIL_TABLE',
        required: true,
        columns: purchaseColumns(),
      },
      field('taxableUnitPriceTotalCents', '申购部门含税单价合计', 'MONEY'),
      field('taxableAmountTotalCents', '申购部门含税金额合计', 'MONEY'),
      field('approvalOpinions', '审批意见', 'APPROVAL_OPINIONS'),
    ],
  },
  printSchemaJson: {
    systemTemplateRevision: 1,
    schemaVersion: 1,
    paper: a4Paper(),
    typography: printTypography(),
    sections: [
      title('物资申购单'),
      grid([
        [cell('申购人', 'applicantId'), cell('申购部门', 'departmentId')],
        [cell('申购日期', 'applicationDate', 3)],
      ]),
      table('申购明细', 'items', purchaseColumns()),
      grid([
        [
          cell('申购部门含税单价合计', 'taxableUnitPriceTotalCents'),
          cell('申购部门含税金额合计', 'taxableAmountTotalCents'),
        ],
      ]),
      opinions(),
    ],
  },
} satisfies CreateFormDefinitionInput;

const MATERIAL_REQUISITION_TEMPLATE = {
  code: 'MATERIAL_REQUISITION_FORM',
  name: '物品领用申请单',
  description: '记录单号、部门、联系人、物资请领与实发明细、附件和审批意见。',
  documentType: 'MATERIAL_REQUISITION',
  changeNote: '系统预置 A4 物品领用申请单',
  schemaJson: {
    systemTemplateRevision: 1,
    schemaVersion: 1,
    layout: 'DETAIL_TABLE_FORM',
    title: '物品领用申请单',
    subtitle: '东方饭店办公自动化审批表',
    fields: [
      field('number', '单号', 'DOCUMENT_NUMBER'),
      field('applicationDate', '填写日期', 'DATE', true),
      field('departmentId', '部门', 'DEPARTMENT', true),
      field('contactUserId', '联系人', 'USER', true),
      {
        key: 'items',
        label: '领用明细',
        type: 'DETAIL_TABLE',
        required: true,
        columns: requisitionColumns(),
      },
      field('attachments', '附件', 'ATTACHMENTS'),
      field('approvalOpinions', '审批意见', 'APPROVAL_OPINIONS'),
    ],
  },
  printSchemaJson: {
    systemTemplateRevision: 1,
    schemaVersion: 1,
    paper: a4Paper(),
    typography: printTypography(),
    sections: [
      title('物品领用申请单'),
      grid([
        [cell('单号', 'number'), cell('填写日期', 'applicationDate')],
        [cell('部门', 'departmentId'), cell('联系人', 'contactUserId')],
      ]),
      table('领用明细', 'items', requisitionColumns()),
      { type: 'ATTACHMENTS', label: '附件', field: 'attachments', minHeightMm: 25 },
      opinions(),
    ],
  },
} satisfies CreateFormDefinitionInput;

export const SUPPLY_FORM_TEMPLATES: CreateFormDefinitionInput[] = [
  MATERIAL_PURCHASE_TEMPLATE,
  MATERIAL_REQUISITION_TEMPLATE,
];

function purchaseColumns() {
  return [
    column('$index', '序号', 8),
    column('name', '品名', 23),
    column('brand', '品牌', 15),
    column('specification', '规格型号', 24),
    column('unit', '单位', 10),
    column('requestedQuantity', '申购数量', 15),
    column('monthlyConsumption', '月消耗数量', 16),
    column('referenceUnitPriceCents', '参考单价', 18),
    column('remark', '备注', 20),
  ];
}

function requisitionColumns() {
  return [
    column('itemCode', '货物编号', 22),
    column('name', '品名', 25),
    column('specification', '规格', 25),
    column('unit', '单位', 10),
    column('requestedQuantity', '请领数量', 18),
    column('issuedQuantity', '实发数量', 18),
    column('purpose', '用途', 35),
  ];
}

function field(key: string, label: string, type: string, required = false) {
  return {
    key,
    label,
    type,
    required,
    ...(type === 'DOCUMENT_NUMBER' || type === 'APPROVAL_OPINIONS' ? { readOnly: true } : {}),
  };
}

function column(fieldName: string, label: string, widthMm: number) {
  return { field: fieldName, key: fieldName, label, widthMm };
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
  return { fontFamily: 'SimSun, Songti SC, serif', baseFontSizePt: 9.5 };
}

function title(text: string) {
  return { type: 'TITLE', text, fontSizePt: 22, align: 'CENTER' };
}

function grid(rows: Array<Array<Record<string, unknown>>>) {
  return { type: 'GRID', columns: [28, 62, 28, 62], rows };
}

function cell(label: string, fieldName: string, colSpan?: number) {
  return { label, field: fieldName, ...(colSpan ? { colSpan } : {}) };
}

function table(label: string, fieldName: string, columns: Array<Record<string, unknown>>) {
  return { type: 'TABLE', label, field: fieldName, columns, minRows: 6 };
}

function opinions() {
  return {
    type: 'APPROVAL_OPINIONS',
    label: '审批意见',
    field: 'approvalOpinions',
    minHeightMm: 55,
  };
}
