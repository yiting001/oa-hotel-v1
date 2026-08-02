import { describe, expect, it } from 'vitest';
import {
  businessCalendarDays,
  businessDateTimeInputValue,
  businessDateKey,
  businessDateRangeKeys,
  businessHour,
  businessLocalDateTimeToIso,
  businessMonthStart,
  shiftBusinessMonth,
} from './business-time';

describe('business time', () => {
  it('uses the configured business day across a UTC midnight boundary', () => {
    const instant = '2026-07-13T16:30:00.000Z';

    expect(businessDateKey(instant, 'Asia/Shanghai')).toBe('2026-07-14');
    expect(businessHour(instant, 'Asia/Shanghai')).toBe(0);
    expect(businessDateKey(instant, 'America/Los_Angeles')).toBe('2026-07-13');
  });

  it('builds a stable 42-day calendar from business date keys', () => {
    const days = businessCalendarDays('2026-07-01');

    expect(days).toHaveLength(42);
    expect(days[0]?.key).toBe('2026-06-28');
    expect(days.at(-1)?.key).toBe('2026-08-08');
    expect(shiftBusinessMonth('2026-07-01', 1)).toBe('2026-08-01');
  });

  it('derives the business month instead of the browser month', () => {
    expect(businessMonthStart('2026-07-31T16:30:00.000Z', 'Asia/Shanghai')).toBe('2026-08-01');
  });

  it('round-trips scheduled wall-clock time in the hotel time zone', () => {
    const iso = businessLocalDateTimeToIso('2026-07-15T09:30', 'Asia/Shanghai');

    expect(iso).toBe('2026-07-15T01:30:00.000Z');
    expect(businessDateTimeInputValue(iso, 'Asia/Shanghai')).toBe('2026-07-15T09:30');
  });

  it('expands timed and all-day events across every covered business date', () => {
    expect(
      businessDateRangeKeys(
        '2026-07-13T15:30:00.000Z',
        '2026-07-13T17:30:00.000Z',
        'Asia/Shanghai',
      ),
    ).toEqual(['2026-07-13', '2026-07-14']);
    expect(
      businessDateRangeKeys(
        '2026-07-13T16:00:00.000Z',
        '2026-07-14T16:00:00.000Z',
        'Asia/Shanghai',
      ),
    ).toEqual(['2026-07-14']);
    expect(
      businessDateRangeKeys(
        '2026-07-12T16:00:00.000Z',
        '2026-07-14T16:00:00.000Z',
        'Asia/Shanghai',
      ),
    ).toEqual(['2026-07-13', '2026-07-14']);
  });
});
