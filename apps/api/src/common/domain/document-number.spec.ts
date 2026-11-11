import { describe, expect, it } from 'vitest';
import { createDocumentNumber } from './document-number';

describe('createDocumentNumber', () => {
  it('用酒店业务日期而不是 UTC 日期生成编号', () => {
    // 北京时间 2026-11-11 01:30，对应 UTC 2026-11-10 17:30
    const instant = new Date('2026-11-10T17:30:00.000Z');
    expect(createDocumentNumber('PETTY', '0f864bfd-1234-4abc-9def-0123456789ab', instant)).toBe(
      'PETTY-20261111-0F864BFD',
    );
  });

  it('去掉 ID 中的连字符并统一大写', () => {
    const instant = new Date('2026-11-11T09:00:00.000Z');
    expect(
      createDocumentNumber('CONTRACT-PAYMENT', 'abcd1234-0000-4000-8000-000000000000', instant),
    ).toBe('CONTRACT-PAYMENT-20261111-ABCD1234');
  });
});
