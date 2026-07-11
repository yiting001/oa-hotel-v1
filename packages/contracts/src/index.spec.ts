import { describe, expect, it } from 'vitest';
import type { DocumentStatus } from './index.js';

describe('shared contracts', () => {
  it('exposes supported document states', () => {
    const state: DocumentStatus = 'DRAFT';
    expect(state).toBe('DRAFT');
  });
});
