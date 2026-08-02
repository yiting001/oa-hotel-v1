import type {
  ApprovalOpinion,
  DocumentPrintTemplate,
  DocumentSummary,
  DocumentType,
} from '@oa/contracts';
import { approvalActionLabels, documentStatusMeta } from '../../../shared/document';
import { formatDateTime } from '../../../shared/format';
import {
  datePeriod,
  displayDocumentValue as display,
  isRecord,
  referenceName,
  referenceNames,
  stringArray,
  stringValue,
} from './document-print-values';
import { applyDocumentPrintTemplate } from './template-print-layout';

export interface DocumentPrintEnvelope {
  data: Record<string, unknown>;
  document: DocumentSummary;
  opinions: ApprovalOpinion[];
}

export interface NamedReference {
  id: string;
  name: string;
}

export interface DocumentPrintReferences {
  users: NamedReference[];
  departments: NamedReference[];
  sealAssets: NamedReference[];
}

export interface PrintField {
  key?: string;
  label: string;
  value: string;
  span: 1 | 2;
}

export interface PrintContentBlock {
  label: string;
  value: string;
  size: 'normal' | 'large';
  minHeightMm?: number;
}

export interface PrintTable {
  title: string;
  columns: Array<{ label: string; width?: string }>;
  rows: string[][];
  minRows: number;
}

export interface PrintOpinion {
  id: string;
  nodeName: string;
  actorName: string;
  organization: string;
  action: string;
  comment: string;
  createdAt: string;
}

export interface PrintPageSettings {
  marginMm: { top: number; right: number; bottom: number; left: number };
  gridLineWidthPx: number;
  showDocumentNumber: boolean;
}

export type BusinessPrintSection =
  | { id: string; type: 'GRID'; rows: PrintField[][] }
  | { id: string; type: 'CONTENT'; block: PrintContentBlock }
  | { id: string; type: 'TABLE'; table: PrintTable }
  | { id: string; type: 'ATTACHMENTS'; label: string; items: string[]; minHeightMm?: number }
  | { id: string; type: 'OPINIONS'; label: string; opinions: PrintOpinion[]; minHeightMm?: number };

export interface BusinessDocumentPrintModel {
  documentType: DocumentType;
  title: string;
  numberLabel: string;
  number: string;
  fields: PrintField[];
  contentBlocks: PrintContentBlock[];
  table: PrintTable | null;
  attachments: string[];
  attachmentsLabel: string;
  opinions: PrintOpinion[];
  opinionsLabel: string;
  showAttachments: boolean;
  showOpinions: boolean;
  statusLabel: string;
  revision: number;
  formVersion: number | null;
  page: PrintPageSettings;
  sections: BusinessPrintSection[];
}

type FieldDefinition = [label: string, key: string, span?: 1 | 2];
type TableColumnDefinition = [label: string, key: string, width?: string];

export function buildBusinessDocumentPrintModel(
  envelope: DocumentPrintEnvelope,
  references: DocumentPrintReferences,
  template: DocumentPrintTemplate | null = null,
): BusinessDocumentPrintModel {
  const base = createBaseModel(envelope);
  const data = envelope.data;
  const legacy = buildLegacyModel(base, data, references);
  legacy.sections = buildLegacyPrintSections(legacy);
  return template ? applyDocumentPrintTemplate(legacy, data, references, template) : legacy;
}

function buildLegacyModel(
  base: BusinessDocumentPrintModel,
  data: Record<string, unknown>,
  references: DocumentPrintReferences,
): BusinessDocumentPrintModel {
  switch (base.documentType) {
    case 'CONTRACT_REQUEST':
      return {
        ...base,
        title: '请示报告',
        numberLabel: '请示编号',
        fields: [
          field('请示题目', display(data, 'title'), 2),
          field('申请部门', referenceName(references.departments, data.departmentId)),
          field('申请人', referenceName(references.users, data.applicantId)),
          field('请示时间', display(data, 'requestedAt')),
          field('请示金额', display(data, 'amountCents')),
        ],
        contentBlocks: [block('请示内容', display(data, 'content'), 'large')],
      };
    case 'CONTRACT_APPROVAL':
      return {
        ...base,
        title: '合同/协议审批表',
        fields: fields(
          data,
          [
            ['签约部门', 'signingDepartmentId'],
            ['签约时间', 'signingDate'],
            ['合同/协议名称', 'name', 2],
            ['合同/协议对方单位全称', 'counterpartyFullName', 2],
            ['金额', 'amountCents'],
            ['需要用印', 'needsSeal'],
            ['乙方联系人', 'counterpartyContact'],
            ['联系电话', 'counterpartyPhone'],
            ['付款方式', 'paymentMethod'],
            ['合同有效期开始', 'validFrom'],
            ['合同有效期结束', 'validTo'],
          ],
          references,
        ),
        contentBlocks: [
          block('合同/协议内容及理由', display(data, 'contentReason'), 'large'),
          block('备注', display(data, 'remark'), 'normal'),
        ],
      };
    case 'CONTRACT_PAYMENT':
      return {
        ...base,
        title: '合同付款审批单',
        fields: contractPaymentFields(data, references),
        contentBlocks: [block('付款原因', display(data, 'paymentReason'), 'large')],
      };
    case 'SEAL_BORROW':
      return {
        ...base,
        title: '印章证照外借申请表',
        fields: sealBorrowFields(data, references),
        contentBlocks: [block('外借事由', display(data, 'content'), 'large')],
      };
    case 'SEAL_USE':
      return {
        ...base,
        title: '印章证照使用申请表',
        fields: sealUseFields(data, references),
        contentBlocks: [
          block('用印内容', display(data, 'content'), 'large'),
          block('执行备注', display(data, 'executionNote'), 'normal'),
        ],
      };
    case 'MATERIAL_PURCHASE':
      return {
        ...base,
        title: '物资申购单',
        fields: applicantFields(data, references, [
          ['申请日期', 'applicationDate', 2],
          ['含税单价合计', 'taxableUnitPriceTotalCents'],
          ['含税金额合计', 'taxableAmountTotalCents'],
        ]),
        table: buildTable(data, '申购明细', [
          ['序号', '$index', '8mm'],
          ['物资名称', 'name', '25mm'],
          ['品牌', 'brand', '16mm'],
          ['规格型号', 'specification', '25mm'],
          ['单位', 'unit', '10mm'],
          ['申请数量', 'requestedQuantity', '16mm'],
          ['月消耗量', 'monthlyConsumption', '16mm'],
          ['参考单价', 'referenceUnitPriceCents', '20mm'],
          ['备注', 'remark'],
        ]),
      };
    case 'MATERIAL_REQUISITION':
      return {
        ...base,
        title: '物品领用申请单',
        fields: requisitionFields(data, references),
        table: buildTable(data, '领用明细', [
          ['序号', '$index', '8mm'],
          ['物资编号', 'itemCode', '20mm'],
          ['物资名称', 'name', '28mm'],
          ['规格型号', 'specification', '28mm'],
          ['单位', 'unit', '11mm'],
          ['申请数量', 'requestedQuantity', '18mm'],
          ['用途', 'purpose'],
          ['实发数量', 'issuedQuantity', '18mm'],
        ]),
      };
    case 'PURCHASE_APPROVAL':
      return {
        ...base,
        title: '采购审批单',
        fields: fields(
          data,
          [
            ['采购名称', 'name', 2],
            ['采购金额', 'amountCents'],
            ['乙方单位', 'counterpartyName'],
            ['乙方联系人', 'counterpartyContact'],
            ['联系电话', 'counterpartyPhone'],
            ['付款方式', 'paymentMethod'],
            ['期望到货时间', 'expectedDeliveryDate'],
          ],
          references,
        ),
        contentBlocks: [block('备注', display(data, 'remark'), 'normal')],
      };
    case 'PETTY_PROCUREMENT':
      return {
        ...base,
        title: '零星采买申请单',
        fields: fields(data, [['合计金额', 'totalAmountCents']], references),
        contentBlocks: [block('申请备注', display(data, 'remark'), 'normal')],
        table: buildTable(data, '采买明细', [
          ['序号', '$index', '8mm'],
          ['物资名称', 'name', '28mm'],
          ['品牌', 'brand', '20mm'],
          ['单价', 'unitPriceCents', '20mm'],
          ['采购数量', 'quantity', '18mm'],
          ['小计', 'subtotalCents', '22mm'],
        ]),
      };
  }
}

function createBaseModel(envelope: DocumentPrintEnvelope): BusinessDocumentPrintModel {
  return {
    documentType: envelope.document.documentType,
    title: '',
    numberLabel: '单据编号',
    number: envelope.document.documentNo ?? stringValue(envelope.data.number),
    fields: [],
    contentBlocks: [],
    table: null,
    attachments: stringArray(envelope.data.attachments),
    attachmentsLabel: '附件',
    opinions: envelope.opinions.map(toPrintOpinion),
    opinionsLabel: '审批意见',
    showAttachments: true,
    showOpinions: true,
    statusLabel: documentStatusMeta[envelope.document.status].label,
    revision: envelope.document.revision,
    formVersion: null,
    page: {
      marginMm: { top: 14, right: 16, bottom: 12, left: 16 },
      gridLineWidthPx: 1,
      showDocumentNumber: true,
    },
    sections: [],
  };
}

export function buildLegacyPrintSections(
  model: BusinessDocumentPrintModel,
): BusinessPrintSection[] {
  const sections: BusinessPrintSection[] = [];
  const fieldRows = groupFields(model.fields);
  if (fieldRows.length > 0) {
    sections.push({ id: 'legacy-grid', type: 'GRID', rows: fieldRows });
  }
  model.contentBlocks.forEach((block, index) => {
    sections.push({ id: `legacy-content-${index}`, type: 'CONTENT', block });
  });
  if (model.table) {
    sections.push({ id: 'legacy-table', type: 'TABLE', table: model.table });
  }
  if (model.showAttachments) {
    sections.push({
      id: 'legacy-attachments',
      type: 'ATTACHMENTS',
      label: model.attachmentsLabel,
      items: model.attachments,
    });
  }
  if (model.showOpinions) {
    sections.push({
      id: 'legacy-opinions',
      type: 'OPINIONS',
      label: model.opinionsLabel,
      opinions: model.opinions,
    });
  }
  return sections;
}

function groupFields(fields: PrintField[]): PrintField[][] {
  const rows: PrintField[][] = [];
  let pending: PrintField[] = [];
  for (const item of fields) {
    if (item.span === 2) {
      if (pending.length > 0) rows.push(pending);
      rows.push([item]);
      pending = [];
      continue;
    }
    pending.push(item);
    if (pending.length === 2) {
      rows.push(pending);
      pending = [];
    }
  }
  if (pending.length > 0) rows.push(pending);
  return rows;
}

function applicantFields(
  data: Record<string, unknown>,
  references: DocumentPrintReferences,
  additional: FieldDefinition[],
): PrintField[] {
  return [
    field('申请部门', referenceName(references.departments, data.departmentId)),
    field('申请人', referenceName(references.users, data.applicantId)),
    ...fields(data, additional, references),
  ];
}

function contractPaymentFields(
  data: Record<string, unknown>,
  references: DocumentPrintReferences,
): PrintField[] {
  return applicantFields(data, references, [
    ['付款项目', 'project', 2],
    ['对方单位全称', 'counterpartyFullName', 2],
    ['合同签订日期', 'contractSigningDate'],
    ['合同期限', '$contractPeriod'],
    ['合同金额', 'contractAmountCents'],
    ['预算金额', 'budgetAmountCents'],
    ['预算累计执行金额', 'budgetExecutedCents'],
    ['会计科目', 'accountingSubject'],
    ['保修期后预计费用', 'maintenanceEstimateCents'],
    ['合同约定付款次数', 'plannedPaymentCount'],
    ['本次付款序次', 'paymentSequence'],
    ['累计已执行金额', 'executedAmountCents'],
    ['未执行金额', 'remainingAmountCents'],
    ['本次付款金额', 'paymentAmountCents'],
    ['本次付款金额大写', 'paymentAmountUppercase', 2],
    ['合同约定进度', 'plannedProgress'],
    ['实际进度', 'actualProgress'],
    ['进度差', 'progressVariance'],
    ['付款方式', 'paymentMethod'],
    ['票据号码', 'invoiceNumber'],
    ['保修期限', '$warrantyPeriod'],
  ]);
}

function sealBorrowFields(
  data: Record<string, unknown>,
  references: DocumentPrintReferences,
): PrintField[] {
  return [
    ...applicantFields(data, references, [
      ['申请日期', 'applicationDate'],
      ['使用日期', 'useDate'],
      ['计划归还日期', 'plannedReturnDate'],
      ['前往地点', 'destination'],
    ]),
    field('陪同人', referenceNames(references.users, data.companionIds), 2),
    field('外借印章/证照', referenceNames(references.sealAssets, data.sealAssetIds), 2),
    ...fields(
      data,
      [
        ['执行状态', 'executionStatus'],
        ['实际领用人', 'actualRecipient'],
        ['领用时间', 'checkedOutAt'],
        ['归还时间', 'returnedAt'],
        ['归还状态', 'returnCondition'],
        ['异常说明', 'exceptionNote'],
      ],
      references,
    ),
  ];
}

function sealUseFields(
  data: Record<string, unknown>,
  references: DocumentPrintReferences,
): PrintField[] {
  return [
    ...applicantFields(data, references, [
      ['申请日期', 'applicationDate'],
      ['使用日期', 'useDate'],
      ['用途', 'purpose', 2],
    ]),
    field('使用印章/证照', referenceNames(references.sealAssets, data.sealAssetIds), 2),
    ...fields(
      data,
      [
        ['执行状态', 'executionStatus'],
        ['盖章份数', 'stampedCopies'],
        ['执行时间', 'executedAt'],
        ['归档号', 'archiveNumber'],
      ],
      references,
    ),
  ];
}

function requisitionFields(
  data: Record<string, unknown>,
  references: DocumentPrintReferences,
): PrintField[] {
  return [
    ...applicantFields(data, references, [['申请日期', 'applicationDate']]),
    field('联系人', referenceName(references.users, data.contactUserId)),
    field('发放状态', display(data, 'issueStatus')),
    field('实发时间', display(data, 'issuedAt')),
    field('实发人', referenceName(references.users, data.issuedBy), 2),
  ];
}

function fields(
  data: Record<string, unknown>,
  definitions: FieldDefinition[],
  references?: DocumentPrintReferences,
): PrintField[] {
  return definitions.map(([label, key, span]) => {
    if (key === 'signingDepartmentId' && references) {
      return field(label, referenceName(references.departments, data[key]), span);
    }
    if (key === '$contractPeriod') {
      return field(label, datePeriod(data.contractStartDate, data.contractEndDate), span);
    }
    if (key === '$warrantyPeriod') {
      return field(label, datePeriod(data.warrantyStartDate, data.warrantyEndDate), span);
    }
    return field(label, display(data, key), span);
  });
}

function field(label: string, value: string, span: 1 | 2 = 1): PrintField {
  return { label, value, span };
}

function block(label: string, value: string, size: PrintContentBlock['size']): PrintContentBlock {
  return { label, value, size };
}

function buildTable(
  data: Record<string, unknown>,
  title: string,
  columns: TableColumnDefinition[],
): PrintTable {
  const items = Array.isArray(data.items) ? data.items.filter(isRecord) : [];
  return {
    title,
    columns: columns.map(([label, , width]) => ({ label, width })),
    rows: items.map((item, index) =>
      columns.map(([, key]) => (key === '$index' ? String(index + 1) : display(item, key))),
    ),
    minRows: 0,
  };
}

function toPrintOpinion(opinion: ApprovalOpinion): PrintOpinion {
  return {
    id: opinion.id,
    nodeName: opinion.processNodeName ?? approvalActionLabels[opinion.action] ?? opinion.action,
    actorName: opinion.actorName,
    organization: [opinion.actorDepartmentName, opinion.actorPositionName]
      .filter(Boolean)
      .join(' / '),
    action: approvalActionLabels[opinion.action] ?? opinion.action,
    comment: opinion.comment || '无补充意见',
    createdAt: formatDateTime(opinion.createdAt),
  };
}
