import { formatFieldValue } from '../../../shared/field';
import { formatDateTime, formatMoney } from '../../../shared/format';
import type { DocumentPrintReferences, NamedReference } from './document-print';

export function displayDocumentValue(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' && isDateKey(key)) {
    return formatChineseDate(value, key.endsWith('At'));
  }
  if (key.endsWith('Cents') && typeof value === 'number') return formatMoney(value);
  return formatFieldValue(key, value);
}

export function resolveDocumentPrintValue(
  data: Record<string, unknown>,
  key: string,
  references: DocumentPrintReferences,
): string {
  if (!key) return '-';
  if (key === '$contractPeriod') return datePeriod(data.contractStartDate, data.contractEndDate);
  if (key === '$warrantyPeriod') return datePeriod(data.warrantyStartDate, data.warrantyEndDate);
  if (key.endsWith('DepartmentId') || key === 'departmentId') {
    return referenceName(references.departments, data[key]);
  }
  if (['applicantId', 'contactUserId', 'issuedBy'].includes(key)) {
    return referenceName(references.users, data[key]);
  }
  if (key === 'companionIds') return referenceNames(references.users, data[key]);
  if (key === 'sealAssetIds') return referenceNames(references.sealAssets, data[key]);
  return displayDocumentValue(data, key);
}

export function datePeriod(start: unknown, end: unknown): string {
  if (!start && !end) return '-';
  return `${formatDateUnknown(start)} 至 ${formatDateUnknown(end)}`;
}

export function referenceName(references: NamedReference[], id: unknown): string {
  const value = stringValue(id);
  if (!value) return '-';
  return references.find((item) => item.id === value)?.name ?? value;
}

export function referenceNames(references: NamedReference[], ids: unknown): string {
  const values = stringArray(ids);
  if (values.length === 0) return '-';
  return values.map((id) => referenceName(references, id)).join('、');
}

export function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
}

export function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDateKey(key: string): boolean {
  return key.endsWith('At') || key.endsWith('Date');
}

function formatChineseDate(value: string, includeTime: boolean): string {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) return `${dateOnly[1]}年${dateOnly[2]}月${dateOnly[3]}日`;
  if (includeTime) return formatDateTime(value);
  const datePrefix = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return datePrefix ? `${datePrefix[1]}年${datePrefix[2]}月${datePrefix[3]}日` : value;
}

function formatDateUnknown(value: unknown): string {
  return typeof value === 'string' && value ? formatChineseDate(value, false) : '-';
}
