import { describe, expect, it } from 'vitest';
import { isDefinitionReadOnly } from './definition-access';

describe('definition access', () => {
  it('keeps VIEW-only users read-only even on draft versions', () => {
    expect(isDefinitionReadOnly('DRAFT', false)).toBe(true);
  });

  it('allows managers to edit drafts but not immutable versions', () => {
    expect(isDefinitionReadOnly('DRAFT', true)).toBe(false);
    expect(isDefinitionReadOnly('PUBLISHED', true)).toBe(true);
    expect(isDefinitionReadOnly('RETIRED', true)).toBe(true);
  });
});
