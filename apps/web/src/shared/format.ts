import { businessDateKey, formatBusinessDate, formatBusinessDateTime } from './business-time';

export function todayIso(): string {
  return businessDateKey();
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) {
    return '-';
  }
  return formatBusinessDateTime(value);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) {
    return '-';
  }
  return formatBusinessDate(value);
}

export function formatMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return '-';
  }
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(cents / 100);
}
