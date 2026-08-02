const defaultBusinessTimeZone = 'Asia/Shanghai';

export const businessTimeZone = validTimeZone(
  import.meta.env.VITE_OA_TIME_ZONE?.trim() || defaultBusinessTimeZone,
);

export interface BusinessCalendarDay {
  key: string;
  label: number;
  current: boolean;
}

export function businessDateKey(
  value: string | Date = new Date(),
  timeZone = businessTimeZone,
): string {
  const parts = dateParts(value, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function businessHour(
  value: string | Date = new Date(),
  timeZone = businessTimeZone,
): number {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    hourCycle: 'h23',
  });
  return Number(formatter.formatToParts(toDate(value)).find((part) => part.type === 'hour')?.value);
}

export function formatBusinessDateTime(value: string | Date, timeZone = businessTimeZone): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(toDate(value));
}

export function formatBusinessDate(value: string | Date, timeZone = businessTimeZone): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(toDate(value));
}

export function formatBusinessLongDate(value: string | Date = new Date()): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: businessTimeZone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(toDate(value));
}

export function businessDateTimeInputValue(
  value: string | Date | null | undefined,
  timeZone = businessTimeZone,
): string {
  if (!value) return '';
  const parts = dateTimeParts(toDate(value), timeZone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Converts a business-zone wall-clock input into the UTC instant stored by the API. */
export function businessLocalDateTimeToIso(value: string, timeZone = businessTimeZone): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error('业务时间格式不正确');
  const target = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );
  let instant = target;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const represented = dateTimeParts(new Date(instant), timeZone);
    const representedValue = Date.UTC(
      Number(represented.year),
      Number(represented.month) - 1,
      Number(represented.day),
      Number(represented.hour),
      Number(represented.minute),
    );
    instant -= representedValue - target;
  }
  const result = new Date(instant);
  if (businessDateTimeInputValue(result, timeZone) !== value) {
    throw new Error('业务时间不合法');
  }
  return result.toISOString();
}

export function businessMonthStart(
  value: string | Date = new Date(),
  timeZone = businessTimeZone,
): string {
  const parts = dateParts(value, timeZone);
  return `${parts.year}-${parts.month}-01`;
}

export function shiftBusinessMonth(monthStart: string, offset: number): string {
  const { year, month } = parseDateKey(monthStart);
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
  return utcDateKey(shifted);
}

export function businessMonthLabel(monthStart: string): string {
  const { year, month } = parseDateKey(monthStart);
  return `${year}年${month}月`;
}

export function businessCalendarDays(monthStart: string): BusinessCalendarDay[] {
  const { year, month } = parseDateKey(monthStart);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - first.getUTCDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    return {
      key: utcDateKey(day),
      label: day.getUTCDate(),
      current: day.getUTCMonth() === month - 1,
    };
  });
}

export function businessDateRangeKeys(
  startAt: string | Date,
  endAt: string | Date,
  timeZone = businessTimeZone,
): string[] {
  const start = toDate(startAt);
  const end = toDate(endAt);
  const effectiveEnd = end.getTime() > start.getTime() ? new Date(end.getTime() - 1) : start;
  const firstKey = businessDateKey(start, timeZone);
  const lastKey = businessDateKey(effectiveEnd, timeZone);
  const keys: string[] = [];
  let cursor = new Date(`${firstKey}T00:00:00.000Z`);
  const last = new Date(`${lastKey}T00:00:00.000Z`);
  while (cursor.getTime() <= last.getTime()) {
    keys.push(utcDateKey(cursor));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return keys;
}

function dateParts(
  value: string | Date,
  timeZone: string,
): {
  year: string;
  month: string;
  day: string;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(toDate(value));
  return {
    year: parts.find((part) => part.type === 'year')?.value ?? '',
    month: parts.find((part) => part.type === 'month')?.value ?? '',
    day: parts.find((part) => part.type === 'day')?.value ?? '',
  };
}

function dateTimeParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: values.get('year') ?? '',
    month: values.get('month') ?? '',
    day: values.get('day') ?? '',
    hour: values.get('hour') ?? '',
    minute: values.get('minute') ?? '',
  };
}

function parseDateKey(value: string): { year: number; month: number } {
  const [year, month] = value.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) throw new Error('业务月份不合法');
  return { year, month };
}

function utcDateKey(value: Date): string {
  return [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, '0'),
    String(value.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function validTimeZone(value: string): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return value;
  } catch {
    return defaultBusinessTimeZone;
  }
}
