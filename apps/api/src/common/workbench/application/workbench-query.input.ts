import { BadRequestException } from '@nestjs/common';
import {
  WORKBENCH_BOXES,
  isDocumentType,
  type DocumentStatus,
  type WorkbenchBox,
} from '@oa/contracts';
import {
  BusinessDateValidationError,
  endOfBusinessDate,
  startOfBusinessDate,
} from '../../time/business-date';
import type { WorkbenchQuery, WorkbenchQueryInput } from '../domain/workbench.types';

const documentStatuses = new Set<DocumentStatus>([
  'DRAFT',
  'IN_REVIEW',
  'RETURNED',
  'APPROVED',
  'CANCELLED',
]);
const workbenchBoxes = new Set<string>(WORKBENCH_BOXES);
const MAX_PAGE_SIZE = 100;
const MAX_KEYWORD_LENGTH = 100;

export function normalizeWorkbenchQuery(input: WorkbenchQueryInput): WorkbenchQuery {
  const box = stringValue(input.box);
  if (!box || !workbenchBoxes.has(box)) {
    invalidQuery('工作台箱体不支持');
  }
  const page = positiveInteger(input.page ?? 1, 'page');
  const pageSize = positiveInteger(input.pageSize ?? 20, 'pageSize');
  if (pageSize > MAX_PAGE_SIZE) invalidQuery('pageSize 不能超过 100');

  const keyword = optionalString(input.keyword);
  if (keyword && keyword.length > MAX_KEYWORD_LENGTH) {
    invalidQuery('关键词不能超过 100 个字符');
  }
  const documentType = optionalString(input.documentType);
  if (documentType && !isDocumentType(documentType)) invalidQuery('流程类型不支持');
  const status = optionalString(input.status);
  if (status && !documentStatuses.has(status as DocumentStatus)) invalidQuery('单据状态不支持');
  const dateFrom = parseDate(input.dateFrom, false);
  const dateTo = parseDate(input.dateTo, true);
  if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
    invalidQuery('开始日期不能晚于结束日期');
  }

  return {
    box: box as WorkbenchBox,
    page,
    pageSize,
    keyword,
    documentType: documentType && isDocumentType(documentType) ? documentType : null,
    applicantId: optionalString(input.applicantId),
    departmentId: optionalString(input.departmentId),
    status: status as DocumentStatus | null,
    dateFrom,
    dateTo,
  };
}

function positiveInteger(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) invalidQuery(`${field} 必须为正整数`);
  return parsed;
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function stringValue(value: unknown): string | null {
  return optionalString(value);
}

function parseDate(value: unknown, endOfDay: boolean): Date | null {
  const normalized = optionalString(value);
  if (!normalized) return null;
  try {
    return endOfDay ? endOfBusinessDate(normalized) : startOfBusinessDate(normalized);
  } catch (error) {
    if (error instanceof BusinessDateValidationError) invalidQuery(error.message);
    throw error;
  }
}

function invalidQuery(message: string): never {
  throw new BadRequestException({ code: 'WORKBENCH_QUERY_INVALID', message });
}
