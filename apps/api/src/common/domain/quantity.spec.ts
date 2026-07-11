import { describe, expect, it } from 'vitest';
import { Quantity } from './quantity';

describe('Quantity', () => {
  it('calculates line amount without floating point', () => {
    expect(Quantity.parse('2.5').multiplyCents(199)).toBe(497);
  });

  it('keeps three decimal precision', () => {
    expect(Quantity.parse('12.340').toString()).toBe('12.34');
  });
});
