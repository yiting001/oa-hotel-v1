import { describe, expect, it } from 'vitest';
import { calculateContractPayment } from './contract-payment';

describe('calculateContractPayment', () => {
  it('calculates remaining amount and progress variance', () => {
    expect(
      calculateContractPayment({
        contractAmountCents: 100_000,
        executedAmountCents: 20_000,
        paymentAmountCents: 30_000,
        plannedPaymentCount: 4,
        paymentSequence: 2,
        plannedProgress: '50%',
        actualProgress: '45%',
      }),
    ).toEqual({
      remainingAmountCents: 50_000,
      paymentAmountUppercase: '叁佰元整',
      progressVariance: '-5.00%',
    });
  });
});
