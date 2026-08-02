import type { CreateFormDefinitionInput } from '../application/form-design.service';

export const SEAL_FORM_TEMPLATES: CreateFormDefinitionInput[] = [
  sealTemplate({
    code: 'SEAL_BORROW_FORM',
    name: '印章证照外借申请表',
    documentType: 'SEAL_BORROW',
    description: '记录印章证照外借日期、地点、陪同人、归还计划和审批意见。',
    fields: [
      field('applicantId', '申请人', 'USER', true),
      field('departmentId', '部门', 'DEPARTMENT', true),
      field('applicationDate', '日期', 'DATE', true),
      field('useDate', '使用日期', 'DATE', true),
      field('plannedReturnDate', '归还日期', 'DATE', true),
      field('companionIds', '陪同人', 'USER_LIST'),
      field('destination', '前往地点', 'TEXT', true),
      field('sealAssetIds', '印章证照名称', 'SEAL_ASSET_LIST', true),
      field('content', '申请内容', 'LONG_TEXT', true),
      field('attachments', '相关附件', 'ATTACHMENTS'),
      field('approvalOpinions', '审批意见', 'APPROVAL_OPINIONS'),
    ],
    rows: [
      [cell('申请人', 'applicantId'), cell('部门', 'departmentId')],
      [cell('日期', 'applicationDate'), cell('使用日期', 'useDate')],
      [cell('归还日期', 'plannedReturnDate'), cell('陪同人', 'companionIds')],
      [cell('前往地点', 'destination', 3)],
      [cell('印章证照名称', 'sealAssetIds', 3)],
    ],
    contentLabel: '申请内容',
    contentField: 'content',
  }),
  sealTemplate({
    code: 'SEAL_USE_FORM',
    name: '印章证照使用申请',
    documentType: 'SEAL_USE',
    description: '记录印章证照使用日期、用途、申请内容、相关附件和审批意见。',
    fields: [
      field('applicantId', '申请人', 'USER', true),
      field('departmentId', '部门', 'DEPARTMENT', true),
      field('applicationDate', '日期', 'DATE', true),
      field('useDate', '使用日期', 'DATE', true),
      field('purpose', '用途', 'LONG_TEXT', true),
      field('sealAssetIds', '印章证照名称', 'SEAL_ASSET_LIST', true),
      field('content', '申请内容', 'LONG_TEXT', true),
      field('attachments', '相关附件', 'ATTACHMENTS'),
      field('approvalOpinions', '审批意见', 'APPROVAL_OPINIONS'),
    ],
    rows: [
      [cell('申请人', 'applicantId'), cell('部门', 'departmentId')],
      [cell('日期', 'applicationDate'), cell('使用日期', 'useDate')],
      [cell('用途', 'purpose', 3)],
      [cell('印章证照名称', 'sealAssetIds', 3)],
    ],
    contentLabel: '申请内容',
    contentField: 'content',
  }),
];

interface SealTemplateInput {
  code: string;
  name: string;
  documentType: string;
  description: string;
  fields: Array<Record<string, unknown>>;
  rows: Array<Array<Record<string, unknown>>>;
  contentLabel: string;
  contentField: string;
}

function sealTemplate(input: SealTemplateInput): CreateFormDefinitionInput {
  return {
    code: input.code,
    name: input.name,
    description: input.description,
    documentType: input.documentType,
    changeNote: `系统预置 A4 ${input.name}`,
    schemaJson: {
      systemTemplateRevision: 1,
      schemaVersion: 1,
      layout: 'SECTIONED_FORM',
      title: input.name,
      subtitle: '东方饭店办公自动化审批表',
      fields: input.fields,
    },
    printSchemaJson: {
      systemTemplateRevision: 1,
      schemaVersion: 1,
      paper: {
        size: 'A4',
        orientation: 'PORTRAIT',
        widthMm: 210,
        heightMm: 297,
        marginMm: { top: 14, right: 14, bottom: 14, left: 14 },
      },
      typography: { fontFamily: 'SimSun, Songti SC, serif', baseFontSizePt: 10.5 },
      sections: [
        { type: 'TITLE', text: input.name, fontSizePt: 22, align: 'CENTER' },
        { type: 'GRID', columns: [28, 62, 28, 62], rows: input.rows },
        { type: 'CONTENT', label: input.contentLabel, field: input.contentField, minHeightMm: 58 },
        { type: 'ATTACHMENTS', label: '相关附件', field: 'attachments', minHeightMm: 25 },
        {
          type: 'APPROVAL_OPINIONS',
          label: '审批意见',
          field: 'approvalOpinions',
          minHeightMm: 55,
        },
      ],
    },
  };
}

function field(key: string, label: string, type: string, required = false) {
  return {
    key,
    label,
    type,
    required,
    ...(type === 'APPROVAL_OPINIONS' ? { readOnly: true } : {}),
  };
}

function cell(label: string, fieldName: string, colSpan?: number) {
  return { label, field: fieldName, ...(colSpan ? { colSpan } : {}) };
}
