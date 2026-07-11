import { DomainError } from '../../../common/errors/domain-error';
import { Money } from '../../../common/domain/money';
import { Quantity } from '../../../common/domain/quantity';
import type { PurchaseItem } from './supply-types';

export function calculatePurchaseTotals(items: PurchaseItem[]): {
  taxableUnitPriceTotalCents: number;
  taxableAmountTotalCents: number;
} {
  if (items.length === 0) {
    throw new DomainError('PURCHASE_ITEMS_REQUIRED', '申购明细至少需要一行');
  }
  return items.reduce(
    (totals, item) => {
      const quantity = Quantity.parse(item.requestedQuantity);
      Quantity.parse(item.monthlyConsumption, true);
      const unitPrice = Money.fromCents(item.referenceUnitPriceCents);
      return {
        taxableUnitPriceTotalCents: totals.taxableUnitPriceTotalCents + unitPrice.cents,
        taxableAmountTotalCents:
          totals.taxableAmountTotalCents + quantity.multiplyCents(unitPrice.cents),
      };
    },
    { taxableUnitPriceTotalCents: 0, taxableAmountTotalCents: 0 },
  );
}
