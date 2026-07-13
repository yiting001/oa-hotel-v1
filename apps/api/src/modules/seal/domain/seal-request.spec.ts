import { describe, expect, it } from 'vitest';
import { validateBorrowPeriod } from './seal-request';

describe('validateBorrowPeriod', () => {
  it('rejects a return date earlier than the use date', () => {
    expect(() => validateBorrowPeriod('2026-07-12', '2026-07-11')).toThrow(
      '归还日期不能早于使用日期',
    );
  });
});
