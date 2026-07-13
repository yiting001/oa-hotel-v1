import { describe, expect, it } from 'vitest';
import { Money } from './money';

describe('Money', () => {
  it('uses integer cents and produces Chinese uppercase', () => {
    expect(Money.fromCents(123_456).toChineseUppercase()).toBe('壹仟贰佰叁拾肆元伍角陆分');
  });

  it('prevents negative subtraction', () => {
    expect(() => Money.fromCents(100).subtract(Money.fromCents(101))).toThrow(
      '金额不能小于扣减金额',
    );
  });
});
