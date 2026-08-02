/** Built-in A4 request report used as both a starter template and print-layout reference. */
export const REQUEST_REPORT_TEMPLATE = {
  code: 'REQUEST_REPORT',
  name: '请示报告',
  description: '适用于酒店各部门通用事项、预算及支出请示的 A4 审批表单。',
  documentType: 'CONTRACT_REQUEST',
  changeNote: '系统预置 A4 请示报告模板',
  schemaJson: {
    systemTemplateRevision: 2,
    schemaVersion: 1,
    layout: 'SECTIONED_FORM',
    title: '请示报告',
    subtitle: '东方饭店办公自动化审批表',
    fields: [
      { key: 'title', label: '标题', type: 'TEXT', required: true, maxLength: 200 },
      { key: 'number', label: '编号', type: 'DOCUMENT_NUMBER', readOnly: true },
      { key: 'departmentId', label: '申请部门', type: 'DEPARTMENT', required: true },
      { key: 'applicantId', label: '申请人', type: 'USER', required: true },
      { key: 'requestedAt', label: '申请时间', type: 'DATE', required: true },
      { key: 'amountCents', label: '申请金额', type: 'MONEY', required: false },
      {
        key: 'content',
        label: '请示事项',
        type: 'LONG_TEXT',
        required: true,
        maxLength: 5000,
      },
      { key: 'attachments', label: '附件', type: 'ATTACHMENTS', required: false },
      {
        key: 'approvalOpinions',
        label: '审批意见',
        type: 'APPROVAL_OPINIONS',
        readOnly: true,
      },
    ],
  },
  printSchemaJson: {
    systemTemplateRevision: 2,
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
      { type: 'TITLE', text: '请 示 报 告', fontSizePt: 22, align: 'CENTER' },
      {
        type: 'GRID',
        columns: [28, 62, 28, 62],
        rows: [
          [{ label: '请示编号', field: 'number' }],
          [{ label: '请示题目', field: 'title', colSpan: 3 }],
          [
            { label: '申请部门', field: 'departmentId' },
            { label: '申请人', field: 'applicantId' },
          ],
          [
            { label: '请示时间', field: 'requestedAt' },
            { label: '请示金额', field: 'amountCents' },
          ],
        ],
      },
      { type: 'CONTENT', label: '请示内容', field: 'content', minHeightMm: 92 },
      { type: 'ATTACHMENTS', label: '附件', field: 'attachments', minHeightMm: 18 },
      {
        type: 'APPROVAL_OPINIONS',
        label: '审批意见',
        field: 'approvalOpinions',
        minHeightMm: 55,
        showActor: true,
        showAction: true,
        showTime: true,
      },
    ],
  },
};
