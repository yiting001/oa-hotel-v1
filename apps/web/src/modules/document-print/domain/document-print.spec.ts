import type {
  ApprovalOpinion,
  DocumentPrintTemplate,
  DocumentSummary,
  DocumentType,
} from '@oa/contracts';
import { describe, expect, it } from 'vitest';
import {
  buildBusinessDocumentPrintModel,
  type DocumentPrintEnvelope,
  type DocumentPrintReferences,
} from './document-print';

const references: DocumentPrintReferences = {
  users: [
    { id: 'user-applicant', name: '李雪' },
    { id: 'user-manager', name: '王经理' },
    { id: 'user-contact', name: '赵联系人' },
  ],
  departments: [{ id: 'dept-business', name: '市场营销部' }],
};

const opinion: ApprovalOpinion = {
  id: 'opinion-1',
  action: 'APPROVE',
  actorName: '王经理',
  actorDepartmentName: '市场营销部',
  actorPositionName: '部门总监',
  processNodeName: '部门审批',
  comment: '同意按方案执行',
  createdAt: '2026-07-13T10:30:00.000Z',
};

describe('buildBusinessDocumentPrintModel', () => {
  it('将合同请示映射为原始 A4 请示报告结构', () => {
    const model = buildBusinessDocumentPrintModel(
      envelope('CONTRACT_REQUEST', {
        number: 'CONTRACT-REQUEST-20260713-001',
        title: '关于更新客房布草的请示',
        departmentId: 'dept-business',
        applicantId: 'user-applicant',
        requestedAt: '2026-07-13',
        amountCents: 1234567,
        content: '为保障旺季客房供应，申请更新布草。',
        attachments: ['布草采购比价表.xlsx'],
      }),
      references,
    );

    expect(model.title).toBe('请示报告');
    expect(model.numberLabel).toBe('请示编号');
    expect(model.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: '申请部门', value: '市场营销部' }),
        expect.objectContaining({ label: '申请人', value: '李雪' }),
        expect.objectContaining({ label: '请示时间', value: '2026年07月13日' }),
      ]),
    );
    expect(model.fields.find((item) => item.label === '请示金额')?.value).toContain('12,345.67');
    expect(model.contentBlocks[0]).toMatchObject({ label: '请示内容', size: 'large' });
    expect(model.attachments).toEqual(['布草采购比价表.xlsx']);
    expect(model.opinions[0]).toMatchObject({
      nodeName: '部门审批',
      actorName: '王经理',
      organization: '市场营销部 / 部门总监',
      action: '同意',
    });
  });

  it.each<[DocumentType, string, Record<string, unknown>]>([
    [
      'CONTRACT_APPROVAL',
      '合同/协议审批表',
      {
        signingDepartmentId: 'dept-business',
        signingDate: '2026-07-13',
        name: '布草采购合同',
        amountCents: 500000,
        counterpartyFullName: '北京某纺织公司',
        contentReason: '采购客房布草',
        needsSeal: true,
      },
    ],
    [
      'CONTRACT_PAYMENT',
      '合同付款审批单',
      {
        applicantId: 'user-applicant',
        departmentId: 'dept-business',
        project: '布草首期款',
        paymentReason: '按合同约定付款',
      },
    ],
    [
      'SEAL_BORROW',
      '印章证照外借申请表',
      {
        applicantId: 'user-applicant',
        departmentId: 'dept-business',
        destination: '政务服务中心',
        companionIds: ['user-manager'],
        sealAssetNames: ['公司公章'],
        content: '办理许可证变更',
      },
    ],
    [
      'SEAL_USE',
      '印章证照使用申请表',
      {
        applicantId: 'user-applicant',
        departmentId: 'dept-business',
        purpose: '合同用印',
        sealAssetNames: ['公司公章'],
        content: '采购合同盖章',
      },
    ],
    [
      'MATERIAL_PURCHASE',
      '物资申购单',
      {
        applicantId: 'user-applicant',
        departmentId: 'dept-business',
        items: [{ name: 'A4 纸', requestedQuantity: '10', unit: '包' }],
      },
    ],
    [
      'MATERIAL_REQUISITION',
      '物品领用申请单',
      {
        applicantId: 'user-applicant',
        departmentId: 'dept-business',
        contactUserId: 'user-contact',
        items: [{ itemCode: 'OFFICE-A4', name: 'A4 纸', requestedQuantity: '2' }],
      },
    ],
  ])('为 %s 生成非空归档模板', (documentType, title, data) => {
    const model = buildBusinessDocumentPrintModel(envelope(documentType, data), references);

    expect(model.title).toBe(title);
    expect(model.fields.length).toBeGreaterThan(0);
    expect(model.opinions).toHaveLength(1);
    expect(model.number).toBe('OA-20260713-001');
  });

  it('将物资明细映射为可打印表格并格式化金额', () => {
    const model = buildBusinessDocumentPrintModel(
      envelope('MATERIAL_PURCHASE', {
        applicantId: 'user-applicant',
        departmentId: 'dept-business',
        items: [
          {
            name: 'A4 复印纸',
            brand: '经典',
            specification: '80g 500张/包',
            unit: '包',
            requestedQuantity: '10',
            monthlyConsumption: '6',
            referenceUnitPriceCents: 2350,
            remark: '行政库存补充',
          },
        ],
      }),
      references,
    );

    expect(model.table?.columns[1].label).toBe('物资名称');
    expect(model.table?.rows[0][0]).toBe('1');
    expect(model.table?.rows[0][7]).toContain('23.50');
  });

  it('uses the immutable A4 template bound to the document', () => {
    const model = buildBusinessDocumentPrintModel(
      envelope('CONTRACT_REQUEST', {
        number: 'QS-20260713-001',
        title: '更新布草的请示',
        departmentId: 'dept-business',
        applicantId: 'user-applicant',
        requestedAt: '2026-07-13',
        amountCents: 1234567,
        content: '申请更新布草。',
        attachments: ['比价表.xlsx'],
      }),
      references,
      requestReportTemplate,
    );

    expect(model.title).toBe('请 示 报 告');
    expect(model.numberLabel).toBe('请示编号');
    expect(model.fields.map((field) => field.label)).toEqual([
      '请示题目',
      '申请部门',
      '申请人',
      '请示时间',
      '请示金额',
    ]);
    expect(model.fields.find((field) => field.label === '申请部门')?.value).toBe('市场营销部');
    expect(model.contentBlocks[0]).toMatchObject({ label: '请示内容', minHeightMm: 92 });
    expect(model.formVersion).toBe(2);
    expect(model.showAttachments).toBe(true);
    expect(model.showOpinions).toBe(false);
    expect(model.page).toEqual({
      marginMm: { top: 12, right: 13, bottom: 14, left: 15 },
      gridLineWidthPx: 1.5,
      showDocumentNumber: false,
    });
    expect(model.sections.map((section) => section.type)).toEqual([
      'GRID',
      'CONTENT',
      'ATTACHMENTS',
    ]);
  });

  it('preserves template row widths and section order', () => {
    const template: DocumentPrintTemplate = {
      ...requestReportTemplate,
      printSchemaJson: {
        paper: { size: 'A4' },
        sections: [
          { type: 'TITLE', text: '物资申购单' },
          {
            type: 'GRID',
            rows: [
              [
                { label: '申购人', field: 'applicantId' },
                { label: '申购部门', field: 'departmentId' },
                { label: '申购日期', field: 'applicationDate' },
              ],
            ],
          },
          {
            type: 'TABLE',
            label: '申购明细',
            field: 'items',
            minRows: 6,
            columns: [
              { label: '序号', field: '$index', widthMm: 8 },
              { label: '品名', field: 'name', widthMm: 24 },
            ],
          },
          {
            type: 'GRID',
            rows: [[{ label: '合计', field: 'taxableAmountTotalCents', colSpan: 3 }]],
          },
          { type: 'APPROVAL_OPINIONS', label: '审批意见', field: 'approvalOpinions' },
        ],
      },
    };
    const model = buildBusinessDocumentPrintModel(
      envelope('MATERIAL_PURCHASE', {
        applicantId: 'user-applicant',
        departmentId: 'dept-business',
        applicationDate: '2026-07-13',
        taxableAmountTotalCents: 23500,
        items: [{ name: 'A4 复印纸' }],
      }),
      references,
      template,
    );

    expect(model.sections.map((section) => section.type)).toEqual([
      'GRID',
      'TABLE',
      'GRID',
      'OPINIONS',
    ]);
    expect(model.sections[0]).toMatchObject({ type: 'GRID', rows: [[{}, {}, {}]] });
    expect(model.sections[1]).toMatchObject({ type: 'TABLE', table: { minRows: 6 } });
  });
});

const requestReportTemplate: DocumentPrintTemplate = {
  formVersionId: 'form-version-2',
  definitionCode: 'REQUEST_REPORT',
  definitionName: '请示报告',
  version: 2,
  schemaJson: {},
  printSchemaJson: {
    paper: {
      size: 'A4',
      marginMm: { top: 12, right: 13, bottom: 14, left: 15 },
    },
    options: {
      showDocumentNumber: false,
      showApprovalOpinions: false,
      gridLineWidth: 1.5,
    },
    sections: [
      { type: 'TITLE', text: '请 示 报 告' },
      {
        type: 'GRID',
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
      { type: 'ATTACHMENTS', label: '附件', field: 'attachments' },
      { type: 'APPROVAL_OPINIONS', label: '审批意见', field: 'approvalOpinions' },
    ],
  },
};

function envelope(
  documentType: DocumentType,
  data: Record<string, unknown>,
): DocumentPrintEnvelope {
  return {
    data: { number: 'OA-20260713-001', attachments: [], ...data },
    document: document(documentType),
    opinions: [opinion],
  };
}

function document(documentType: DocumentType): DocumentSummary {
  return {
    id: 'document-1',
    documentType,
    module: documentType.startsWith('CONTRACT')
      ? 'CONTRACT'
      : documentType.startsWith('SEAL')
        ? 'SEAL'
        : 'SUPPLY',
    title: '测试单据',
    applicantId: 'user-applicant',
    departmentId: 'dept-business',
    status: 'APPROVED',
    documentNo: null,
    revision: 2,
    currentStep: null,
    workflowCode: 'TEST_FLOW',
    processVersionId: 'process-version-1',
    formVersionId: 'form-version-1',
    createdAt: '2026-07-13T08:00:00.000Z',
    updatedAt: '2026-07-13T10:30:00.000Z',
  };
}
