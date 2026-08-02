const DEFAULT_BUSINESS_TIME_ZONE = 'Asia/Shanghai';
const businessDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export class BusinessDateValidationError extends Error {}

export function businessTimeZone(environment = process.env): string {
  const timeZone = environment.OA_TIME_ZONE?.trim() || DEFAULT_BUSINESS_TIME_ZONE;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date(0));
  } catch {
    throw new Error(`OA_TIME_ZONE 不是有效的 IANA 时区: ${timeZone}`);
  }
  return timeZone;
}

/** Converts one hotel-local calendar date boundary into its UTC storage instant. */
export function startOfBusinessDate(value: string, timeZone = businessTimeZone()): Date {
  return zonedLocalDateTimeToUtc(parseBusinessDate(value), timeZone);
}

export function endOfBusinessDate(value: string, timeZone = businessTimeZone()): Date {
  const nextDate = addCalendarDays(parseBusinessDate(value), 1);
  return new Date(zonedLocalDateTimeToUtc(nextDate, timeZone).getTime() - 1);
}

export function inclusiveBusinessDateDays(from: string, to: string): number {
  const start = parseBusinessDate(from);
  const end = parseBusinessDate(to);
  const startValue = Date.UTC(start.year, start.month - 1, start.day);
  const endValue = Date.UTC(end.year, end.month - 1, end.day);
  return Math.floor((endValue - startValue) / 86_400_000) + 1;
}

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

function parseBusinessDate(value: string): CalendarDate {
  const match = businessDatePattern.exec(value);
  if (!match) throw new BusinessDateValidationError('日期必须使用 YYYY-MM-DD 格式');
  const result = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
  const check = new Date(Date.UTC(result.year, result.month - 1, result.day));
  if (
    check.getUTCFullYear() !== result.year ||
    check.getUTCMonth() + 1 !== result.month ||
    check.getUTCDate() !== result.day
  ) {
    throw new BusinessDateValidationError('日期不合法');
  }
  return result;
}

function addCalendarDays(value: CalendarDate, days: number): CalendarDate {
  const date = new Date(Date.UTC(value.year, value.month - 1, value.day + days));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function zonedLocalDateTimeToUtc(value: CalendarDate, timeZone: string): Date {
  const target = Date.UTC(value.year, value.month - 1, value.day);
  let instant = target;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const represented = representedUtcValue(new Date(instant), timeZone);
    instant -= represented - target;
  }
  return new Date(instant);
}

function representedUtcValue(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return Date.UTC(
    Number(values.get('year')),
    Number(values.get('month')) - 1,
    Number(values.get('day')),
    Number(values.get('hour')),
    Number(values.get('minute')),
    Number(values.get('second')),
  );
}
