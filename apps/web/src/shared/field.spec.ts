import { describe, expect, it } from 'vitest';
import { fieldLabels, formatFieldValue } from './field';

describe('field labels', () => {
  it('印章使用/借用字段使用中文标签', () => {
    expect(fieldLabels.submitTo).toBe('报送单位');
    expect(fieldLabels.sealCategories).toBe('用章类别及数量');
    expect(fieldLabels.sealTakeout).toBe('公章外带');
    expect(fieldLabels.licenseTakeout).toBe('证照外带');
  });

  it('请示的致送与发出字段使用中文标签', () => {
    expect(fieldLabels.addressee).toBe('致送');
    expect(fieldLabels.issuer).toBe('发出');
  });

  it('所有字段标签都是中文，不直接展示英文字段名', () => {
    for (const [key, label] of Object.entries(fieldLabels)) {
      expect(label, key).not.toBe(key);
      expect(label, key).toMatch(/[\u4e00-\u9fa5]/);
    }
  });

  it('用章类别同时展示份数', () => {
    expect(
      formatFieldValue('sealCategories', [
        { name: '公章', copies: 1 },
        { name: '合同章', copies: 2 },
      ]),
    ).toBe('公章 ×1、合同章 ×2');
    expect(formatFieldValue('sealCategories', [])).toBe('-');
  });

  it('外带开关展示为是/否', () => {
    expect(formatFieldValue('sealTakeout', false)).toBe('否');
    expect(formatFieldValue('licenseTakeout', true)).toBe('是');
  });
});
