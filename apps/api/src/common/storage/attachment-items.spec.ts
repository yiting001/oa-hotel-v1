import { describe, expect, it } from 'vitest';
import { normalizeAttachments } from './attachment-items';

describe('normalizeAttachments', () => {
  it('keeps uploaded attachments with id and trimmed file name', () => {
    expect(normalizeAttachments([{ id: 'att-1', fileName: ' 方案.pdf ' }])).toEqual([
      { id: 'att-1', fileName: '方案.pdf' },
    ]);
  });

  it('keeps legacy file names and drops empty entries', () => {
    expect(normalizeAttachments([' 合同扫描件.pdf ', '', '   '])).toEqual(['合同扫描件.pdf']);
  });

  it('drops uploaded attachments without an id', () => {
    expect(normalizeAttachments([{ id: '', fileName: '方案.pdf' }])).toEqual([]);
  });
});
