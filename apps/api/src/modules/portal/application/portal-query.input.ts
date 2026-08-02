import { BadRequestException } from '@nestjs/common';
import {
  PORTAL_CONTENT_CATEGORIES,
  type PortalContentCategory,
  type PortalReadingStatus,
} from '@oa/contracts';
import {
  BusinessDateValidationError,
  endOfBusinessDate,
  inclusiveBusinessDateDays,
  startOfBusinessDate,
} from '../../../common/time/business-date';

const categories = new Set<string>(PORTAL_CONTENT_CATEGORIES);
const MAX_PAGE_SIZE = 100;
const MAX_CALENDAR_DAYS = 62;
const readingStatuses = new Set<string>(['ALL', 'UNREAD', 'READ']);

export interface PortalContentListQueryInput {
  category?: unknown;
  page?: unknown;
  pageSize?: unknown;
}

export interface NormalizedPortalContentListQuery {
  category: PortalContentCategory;
  page: number;
  pageSize: number;
}

export interface PortalCalendarQueryInput {
  from?: unknown;
  to?: unknown;
}

export interface NormalizedPortalCalendarQuery {
  from: string;
  to: string;
  fromAt: Date;
  toAt: Date;
}

export interface PortalReadingQueryInput {
  status?: unknown;
  page?: unknown;
  pageSize?: unknown;
}

export interface NormalizedPortalReadingQuery {
  status: PortalReadingStatus;
  page: number;
  pageSize: number;
}

export function normalizePortalContentListQuery(
  input: PortalContentListQueryInput,
): NormalizedPortalContentListQuery {
  const category = optionalString(input.category);
  if (!category || !categories.has(category)) contentQueryError('门户栏目不支持');
  const page = positiveInteger(input.page ?? 1, 'page', contentQueryError);
  const pageSize = positiveInteger(input.pageSize ?? 20, 'pageSize', contentQueryError);
  if (pageSize > MAX_PAGE_SIZE) contentQueryError('pageSize 不能超过 100');
  return { category: category as PortalContentCategory, page, pageSize };
}

export function normalizePortalCalendarQuery(
  input: PortalCalendarQueryInput,
): NormalizedPortalCalendarQuery {
  const from = optionalString(input.from);
  const to = optionalString(input.to);
  if (!from || !to) calendarQueryError('日历开始和结束日期必填');
  try {
    const days = inclusiveBusinessDateDays(from, to);
    if (days < 1) calendarQueryError('日历开始日期不能晚于结束日期');
    if (days > MAX_CALENDAR_DAYS) calendarQueryError('日历查询范围不能超过 62 天');
    return {
      from,
      to,
      fromAt: startOfBusinessDate(from),
      toAt: endOfBusinessDate(to),
    };
  } catch (error) {
    if (error instanceof BusinessDateValidationError) calendarQueryError(error.message);
    throw error;
  }
}

export function normalizePortalReadingQuery(
  input: PortalReadingQueryInput,
): NormalizedPortalReadingQuery {
  const status = optionalString(input.status) ?? 'ALL';
  if (!readingStatuses.has(status)) readingQueryError('阅读状态不支持');
  const page = positiveInteger(input.page ?? 1, 'page', readingQueryError);
  const pageSize = positiveInteger(input.pageSize ?? 20, 'pageSize', readingQueryError);
  if (pageSize > MAX_PAGE_SIZE) readingQueryError('pageSize 不能超过 100');
  return { status: status as PortalReadingStatus, page, pageSize };
}

function positiveInteger(value: unknown, field: string, fail: (message: string) => never): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) fail(`${field} 必须为正整数`);
  return parsed;
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function contentQueryError(message: string): never {
  throw new BadRequestException({ code: 'PORTAL_CONTENT_QUERY_INVALID', message });
}

function calendarQueryError(message: string): never {
  throw new BadRequestException({ code: 'PORTAL_CALENDAR_QUERY_INVALID', message });
}

function readingQueryError(message: string): never {
  throw new BadRequestException({ code: 'PORTAL_READING_QUERY_INVALID', message });
}
