import { describe, expect, it } from 'vitest';
import { PHONE_PATTERN, normalizePhone } from './phone';

describe('phone', () => {
  it('接受 1 开头的 11 位手机号', () => {
    expect(PHONE_PATTERN.test('13810271599')).toBe(true);
    expect(PHONE_PATTERN.test('19912345678')).toBe(true);
    expect(PHONE_PATTERN.test('12810271599')).toBe(false);
    expect(PHONE_PATTERN.test('1381027159')).toBe(false);
    expect(PHONE_PATTERN.test('138102715991')).toBe(false);
  });

  it('去掉空格和连字符后再校验', () => {
    expect(normalizePhone(' 138 1027 1599 ')).toBe('13810271599');
    expect(normalizePhone('138-1027-1599')).toBe('13810271599');
    expect(normalizePhone('1381027159')).toBeNull();
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
  });
});
