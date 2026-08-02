import type { DocumentPrintTemplate } from '@oa/contracts';
import type {
  BusinessPrintSection,
  BusinessDocumentPrintModel,
  DocumentPrintReferences,
  PrintContentBlock,
  PrintField,
  PrintTable,
} from './document-print';
import { resolveDocumentPrintValue } from './document-print-values';

export function applyDocumentPrintTemplate(
  base: BusinessDocumentPrintModel,
  data: Record<string, unknown>,
  references: DocumentPrintReferences,
  template: DocumentPrintTemplate,
): BusinessDocumentPrintModel {
  const page = resolvePageSettings(template.printSchemaJson, base.page);
  const sections = Array.isArray(template.printSchemaJson.sections)
    ? template.printSchemaJson.sections.filter(isRecord)
    : [];
  if (sections.length === 0) {
    return { ...base, page };
  }

  const titleSection = sections.find((section) => section.type === 'TITLE');
  const options = isRecord(template.printSchemaJson.options)
    ? template.printSchemaJson.options
    : {};
  const showApprovalOpinions = options.showApprovalOpinions !== false;
  const renderedSections = sections
    .flatMap((section, index) => renderSection(section, index, base, data, references))
    .filter((section) => section.type !== 'OPINIONS' || showApprovalOpinions);
  const fields = renderedSections
    .filter((section) => section.type === 'GRID')
    .flatMap((section) => section.rows.flat());
  const contentBlocks = renderedSections
    .filter((section) => section.type === 'CONTENT')
    .map((section) => section.block);
  const table = renderedSections.find((section) => section.type === 'TABLE')?.table ?? null;
  const attachmentsSection = sections.find((section) => section.type === 'ATTACHMENTS');
  const opinionsSection = sections.find((section) => section.type === 'APPROVAL_OPINIONS');
  const numberField = gridCells(sections).find((cell) => cell.field === 'number');

  return {
    ...base,
    title: stringValue(titleSection?.text) || template.definitionName || base.title,
    numberLabel: stringValue(numberField?.label) || base.numberLabel,
    fields,
    contentBlocks,
    table,
    attachmentsLabel: stringValue(attachmentsSection?.label) || '附件',
    opinionsLabel: stringValue(opinionsSection?.label) || '审批意见',
    showAttachments: Boolean(attachmentsSection),
    showOpinions: Boolean(opinionsSection) && showApprovalOpinions,
    formVersion: template.version,
    page,
    sections: renderedSections,
  };
}

function resolvePageSettings(
  printSchema: Record<string, unknown>,
  fallback: BusinessDocumentPrintModel['page'],
): BusinessDocumentPrintModel['page'] {
  const paper = isRecord(printSchema.paper) ? printSchema.paper : {};
  const margin = isRecord(paper.marginMm) ? paper.marginMm : {};
  const options = isRecord(printSchema.options) ? printSchema.options : {};
  return {
    marginMm: {
      top: boundedNumber(margin.top, 0, 30, fallback.marginMm.top),
      right: boundedNumber(margin.right, 0, 30, fallback.marginMm.right),
      bottom: boundedNumber(margin.bottom, 0, 30, fallback.marginMm.bottom),
      left: boundedNumber(margin.left, 0, 30, fallback.marginMm.left),
    },
    gridLineWidthPx: boundedNumber(options.gridLineWidth, 0.5, 2, fallback.gridLineWidthPx),
    showDocumentNumber:
      typeof options.showDocumentNumber === 'boolean'
        ? options.showDocumentNumber
        : fallback.showDocumentNumber,
  };
}

function renderSection(
  section: Record<string, unknown>,
  index: number,
  base: BusinessDocumentPrintModel,
  data: Record<string, unknown>,
  references: DocumentPrintReferences,
): BusinessPrintSection[] {
  const id = `template-${index}-${String(section.type).toLowerCase()}`;
  if (section.type === 'GRID') {
    const rows = gridRows(section, data, references)
      .map((row) => row.filter((field) => field.key !== 'number'))
      .filter((row) => row.length > 0);
    return rows.length > 0 ? [{ id, type: 'GRID', rows }] : [];
  }
  if (section.type === 'CONTENT') {
    return [{ id, type: 'CONTENT', block: contentBlock(section, data, references) }];
  }
  if (section.type === 'TABLE') {
    return [{ id, type: 'TABLE', table: printTable(section, data, references) }];
  }
  if (section.type === 'ATTACHMENTS') {
    const items = stringArray(data[stringValue(section.field)]);
    return [
      {
        id,
        type: 'ATTACHMENTS',
        label: stringValue(section.label) || '附件',
        items: items.length > 0 ? items : base.attachments,
        minHeightMm: optionalNumber(section.minHeightMm),
      },
    ];
  }
  if (section.type === 'APPROVAL_OPINIONS') {
    return [
      {
        id,
        type: 'OPINIONS',
        label: stringValue(section.label) || '审批意见',
        opinions: base.opinions,
        minHeightMm: optionalNumber(section.minHeightMm),
      },
    ];
  }
  return [];
}

function gridRows(
  section: Record<string, unknown>,
  data: Record<string, unknown>,
  references: DocumentPrintReferences,
): Array<Array<PrintField & { key: string }>> {
  if (Array.isArray(section.rows)) {
    return section.rows
      .filter(Array.isArray)
      .map((row) => row.filter(isRecord).map((cell) => printField(cell, data, references)));
  }
  const fields = Array.isArray(section.fields) ? section.fields.filter(isRecord) : [];
  return groupFields(fields.map((cell) => printField(cell, data, references)));
}

function cellsFromGrid(section: Record<string, unknown>): Record<string, unknown>[] {
  const rows = Array.isArray(section.rows) ? section.rows : [];
  const rowCells = rows.flatMap((row) => (Array.isArray(row) ? row.filter(isRecord) : []));
  const fields = Array.isArray(section.fields) ? section.fields.filter(isRecord) : [];
  return rowCells.length > 0 ? rowCells : fields;
}

function printField(
  cell: Record<string, unknown>,
  data: Record<string, unknown>,
  references: DocumentPrintReferences,
): PrintField & { key: string } {
  const key = stringValue(cell.field);
  return {
    key,
    label: stringValue(cell.label) || key,
    value: resolveDocumentPrintValue(data, key, references),
    span: wideCell(cell) ? 2 : 1,
  };
}

function groupFields(fields: Array<PrintField & { key: string }>) {
  const rows: Array<Array<PrintField & { key: string }>> = [];
  let pending: Array<PrintField & { key: string }> = [];
  for (const field of fields) {
    if (field.span === 2) {
      if (pending.length > 0) rows.push(pending);
      rows.push([field]);
      pending = [];
    } else {
      pending.push(field);
      if (pending.length === 2) {
        rows.push(pending);
        pending = [];
      }
    }
  }
  if (pending.length > 0) rows.push(pending);
  return rows;
}

function gridCells(sections: Record<string, unknown>[]): Record<string, unknown>[] {
  return sections
    .filter((section) => section.type === 'GRID')
    .flatMap((section) => cellsFromGrid(section));
}

function wideCell(cell: Record<string, unknown>): boolean {
  return cell.span === 2 || (typeof cell.colSpan === 'number' && cell.colSpan >= 3);
}

function contentBlock(
  section: Record<string, unknown>,
  data: Record<string, unknown>,
  references: DocumentPrintReferences,
): PrintContentBlock {
  const minHeightMm = numberValue(section.minHeightMm);
  return {
    label: stringValue(section.label) || '内容',
    value: resolveDocumentPrintValue(data, stringValue(section.field), references),
    size: minHeightMm >= 50 ? 'large' : 'normal',
    minHeightMm: minHeightMm || undefined,
  };
}

function printTable(
  section: Record<string, unknown>,
  data: Record<string, unknown>,
  references: DocumentPrintReferences,
): PrintTable {
  const field = stringValue(section.field) || 'items';
  const items = Array.isArray(data[field]) ? data[field].filter(isRecord) : [];
  const columns = Array.isArray(section.columns) ? section.columns.filter(isRecord) : [];
  return {
    title: stringValue(section.label) || '明细',
    columns: columns.map((column) => ({
      label: stringValue(column.label) || stringValue(column.field),
      width: widthValue(column.widthMm ?? column.width),
    })),
    rows: items.map((item, index) =>
      columns.map((column) => {
        const key = stringValue(column.field ?? column.key);
        return key === '$index'
          ? String(index + 1)
          : resolveDocumentPrintValue(item, key, references);
      }),
    ),
    minRows: nonNegativeInteger(section.minRows),
  };
}

function widthValue(value: unknown): string | undefined {
  if (typeof value === 'number' && value > 0) return `${value}mm`;
  return typeof value === 'string' && value ? value : undefined;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function boundedNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = numberValue(value);
  return parsed >= min && parsed <= max ? parsed : fallback;
}

function optionalNumber(value: unknown): number | undefined {
  const parsed = numberValue(value);
  return parsed > 0 ? parsed : undefined;
}

function nonNegativeInteger(value: unknown): number {
  const parsed = numberValue(value);
  return parsed > 0 ? Math.floor(parsed) : 0;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
