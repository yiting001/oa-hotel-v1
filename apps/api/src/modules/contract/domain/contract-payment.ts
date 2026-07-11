import { DomainError } from '../../../common/errors/domain-error';
import { Money } from '../../../common/domain/money';

export interface ContractPaymentCalculationInput {
  contractAmountCents: number;
  executedAmountCents: number;
  paymentAmountCents: number;
  plannedPaymentCount: number;
  paymentSequence: number;
  plannedProgress: string;
  actualProgress: string;
}

export interface ContractPaymentCalculation {
  remainingAmountCents: number;
  paymentAmountUppercase: string;
  progressVariance: string;
}

export function calculateContractPayment(
  input: ContractPaymentCalculationInput,
): ContractPaymentCalculation {
  if (input.paymentSequence > input.plannedPaymentCount) {
    throw new DomainError('PAYMENT_SEQUENCE_EXCEEDED', '本次付款次数不能超过合同约定次数');
  }
  const available = Money.fromCents(input.contractAmountCents).subtract(
    Money.fromCents(input.executedAmountCents),
  );
  const payment = Money.fromCents(input.paymentAmountCents);
  const remaining = available.subtract(payment);
  const planned = parseProgress(input.plannedProgress);
  const actual = parseProgress(input.actualProgress);
  return {
    remainingAmountCents: remaining.cents,
    paymentAmountUppercase: payment.toChineseUppercase(),
    progressVariance: `${(actual - planned).toFixed(2)}%`,
  };
}

function parseProgress(value: string): number {
  const normalized = value.trim().replace('%', '');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new DomainError('INVALID_PROGRESS', '合同进度必须是 0 到 100 的百分比');
  }
  return parsed;
}
