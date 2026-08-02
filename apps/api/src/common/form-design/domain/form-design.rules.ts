import { DomainError } from '../../errors/domain-error';
import type { FormVersion } from './form-design.types';

/** Published and retired versions are audit records and must never be overwritten. */
export function assertFormVersionEditable(version: FormVersion): void {
  if (version.status !== 'DRAFT') {
    throw new DomainError('FORM_VERSION_IMMUTABLE', '已发布或已退役的表单版本不可修改');
  }
}

/** A publishable form must contain fields and a concrete A4 print composition. */
export function validateFormForPublishing(version: FormVersion): void {
  const fields = version.schemaJson.fields;
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new DomainError('FORM_SCHEMA_INVALID', '表单至少需要一个字段');
  }
  for (const field of fields) {
    if (!isRecord(field) || !isNonEmptyString(field.key) || !isNonEmptyString(field.type)) {
      throw new DomainError('FORM_SCHEMA_INVALID', '每个表单字段都必须包含 key 和 type');
    }
  }

  const paper = version.printSchemaJson.paper;
  const sections = version.printSchemaJson.sections;
  if (!isRecord(paper) || paper.size !== 'A4') {
    throw new DomainError('FORM_PRINT_SCHEMA_INVALID', '打印模板必须明确使用 A4 纸张');
  }
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new DomainError('FORM_PRINT_SCHEMA_INVALID', '打印模板至少需要一个版面区域');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
