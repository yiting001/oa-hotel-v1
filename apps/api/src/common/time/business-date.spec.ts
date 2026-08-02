import { describe, expect, it } from 'vitest';
import {
  BusinessDateValidationError,
  businessTimeZone,
  endOfBusinessDate,
  inclusiveBusinessDateDays,
  startOfBusinessDate,
} from './business-date';

describe('business date boundaries', () => {
  it('uses the configured hotel timezone and defaults to Asia/Shanghai', () => {
    expect(businessTimeZone({})).toBe('Asia/Shanghai');
    expect(businessTimeZone({ OA_TIME_ZONE: 'America/Los_Angeles' })).toBe('America/Los_Angeles');
  });

  it('converts a Shanghai local day to UTC without hard-coded offsets', () => {
    expect(startOfBusinessDate('2026-07-13', 'Asia/Shanghai').toISOString()).toBe(
      '2026-07-12T16:00:00.000Z',
    );
    expect(endOfBusinessDate('2026-07-13', 'Asia/Shanghai').toISOString()).toBe(
      '2026-07-13T15:59:59.999Z',
    );
  });

  it('observes daylight-saving transitions for configurable locations', () => {
    expect(startOfBusinessDate('2026-03-08', 'America/Los_Angeles').toISOString()).toBe(
      '2026-03-08T08:00:00.000Z',
    );
    expect(endOfBusinessDate('2026-03-08', 'America/Los_Angeles').toISOString()).toBe(
      '2026-03-09T06:59:59.999Z',
    );
  });

  it('validates real calendar dates and inclusive range length', () => {
    expect(inclusiveBusinessDateDays('2026-07-01', '2026-08-31')).toBe(62);
    expect(() => startOfBusinessDate('2026-02-31')).toThrow(BusinessDateValidationError);
    expect(() => businessTimeZone({ OA_TIME_ZONE: 'Invalid/Zone' })).toThrow('OA_TIME_ZONE');
  });
});
