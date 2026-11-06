import type { CreateFormDefinitionInput } from '../application/form-design.service';

/**
 * 线下《餐饮食品原材料请购单》对应的 A4 版式：
 * 班组 + 日期，品名/数量/单位/要求/备注明细，底部为填单人、厨师长、送单时间、
 * 部门审核和财务审核签字栏。
 */
const FOOD_PURCHASE_TEMPLATE = {
  code: 'FOOD_PURCHASE_FORM',
  name: '餐饮食品原材料请购单',
  description: '按班组登记食材请购明细，包含要求、备注、签字栏和审批意见。',
  documentType: 'FOOD_PURCHASE',
  changeNote: '系统预置 A4 餐饮食品原材料请购单',
  schemaJson: {
    systemTemplateRevision: 1,
    schemaVersion: 1,
    layout: 'DETAIL_TABLE_FORM',
    title: '餐饮食品原材料请购单',
    subtitle: '东方饭店办公自动化审批表',
    fields: [
      field('teamName', '班组', 'TEXT'),
      field('applicationDate', '日期', 'DATE', true),
      field('applicantId', '申请人', 'USER'),
      field('departmentId', '申请部门', 'DEPARTMENT'),
      {
        key: 'items',
        label: '请购明细',
        type: 'DETAIL_TABLE',
        required: true,
        columns: foodColumns(),
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
      title('餐饮食品原材料请购单'),
      grid([
        [cell('班组', 'teamName'), cell('日期', 'applicationDate')],
        [cell('申请部门', 'departmentId'), cell('申请人', 'applicantId')],
      ]),
      table('请购明细', 'items', foodColumns(), 12),
      // 签字栏：与线下请购单一致，留空由经办人/厨师长/部门/财务手签
      grid([
        [signatureCell('填单人'), signatureCell('厨师长签字'), signatureCell('送单时间')],
        [signatureCell('部门审核'), signatureCell('财务审核')],
      ]),
      { type: 'ATTACHMENTS', label: '附件', field: 'attachments', minHeightMm: 20 },
      opinions(),
    ],
  },
} satisfies CreateFormDefinitionInput;

export const FOOD_FORM_TEMPLATES: CreateFormDefinitionInput[] = [FOOD_PURCHASE_TEMPLATE];

function foodColumns() {
  return [
    column('name', '品名', 60),
    column('quantity', '数量', 24),
    column('unit', '单位', 18),
    column('requirement', '要求', 45),
    column('remark', '备注', 35),
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

/** 签字栏使用固定空文本，不显示占位的「-」。 */
function signatureCell(label: string) {
  return { label, field: '', text: '' };
}

function table(
  label: string,
  fieldName: string,
  columns: Array<Record<string, unknown>>,
  minRows: number,
) {
  return { type: 'TABLE', label, field: fieldName, columns, minRows };
}

function opinions() {
  return {
    type: 'APPROVAL_OPINIONS',
    label: '审批意见',
    field: 'approvalOpinions',
    minHeightMm: 40,
  };
}
