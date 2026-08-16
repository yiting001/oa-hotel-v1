import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';
import { applyChineseDateLocale } from './locale';

describe('applyChineseDateLocale', () => {
  it('switches the global dayjs locale to zh-cn', () => {
    applyChineseDateLocale();
    expect(dayjs.locale()).toBe('zh-cn');
  });

  it('formats weekdays and months in Chinese', () => {
    applyChineseDateLocale();
    const monday = dayjs('2026-01-05');
    expect(monday.format('dddd')).toBe('星期一');
    expect(monday.format('MMMM')).toBe('一月');
  });
});
