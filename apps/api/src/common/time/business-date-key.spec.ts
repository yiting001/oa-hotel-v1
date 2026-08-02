import { describe, expect, it } from 'vitest';
import { businessDateKey } from './business-date';

describe('businessDateKey', () => {
  it('formats instants using the business time zone', () => {
    expect(businessDateKey(new Date('2026-07-27T04:00:00Z'), 'Asia/Shanghai')).toBe('20260727');
  });

  it('rolls to the next local day across the UTC boundary', () => {
    expect(businessDateKey(new Date('2026-07-27T17:30:00Z'), 'Asia/Shanghai')).toBe('20260728');
  });
});
