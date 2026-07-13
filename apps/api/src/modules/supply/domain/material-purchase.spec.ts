import { describe, expect, it } from 'vitest';
import { calculatePurchaseTotals } from './material-purchase';

describe('calculatePurchaseTotals', () => {
  it('calculates totals using scaled quantities', () => {
    expect(
      calculatePurchaseTotals([
        {
          name: '纸张',
          brand: null,
          specification: 'A4',
          unit: '包',
          requestedQuantity: '2.5',
          monthlyConsumption: '1',
          referenceUnitPriceCents: 199,
          remark: null,
        },
      ]),
    ).toEqual({
      taxableUnitPriceTotalCents: 199,
      taxableAmountTotalCents: 497,
    });
  });
});
