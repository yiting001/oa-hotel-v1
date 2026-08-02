import type { Rule } from 'ant-design-vue/es/form';
import { describe, expect, it } from 'vitest';
import { createContractPaymentRules, parsePaymentProgress } from './contract-payment.rules';
import type { ContractPaymentPayload } from './contract.types';

describe('contract payment form rules', () => {
  it('accepts progress only between zero and one hundred', () => {
    expect(parsePaymentProgress('0')).toBe(0);
    expect(parsePaymentProgress('75.5%')).toBe(75.5);
    expect(parsePaymentProgress('101')).toBeNull();
    expect(parsePaymentProgress('invalid')).toBeNull();
  });

  it('rejects a payment above the contract balance', async () => {
    const form = paymentForm({
      contractAmountCents: 100_000,
      executedAmountCents: 20_000,
      budgetAmountCents: 200_000,
    });

    await expect(validate(form, 'paymentAmountCents', 80_001)).rejects.toThrow(
      '不能超过未执行合同金额',
    );
  });

  it('rejects a payment above the available budget', async () => {
    const form = paymentForm({
      contractAmountCents: 200_000,
      budgetAmountCents: 100_000,
      budgetExecutedCents: 30_000,
    });

    await expect(validate(form, 'paymentAmountCents', 70_001)).rejects.toThrow(
      '不能超过可用预算余额',
    );
  });

  it('rejects a payment sequence above the planned count', async () => {
    const form = paymentForm({ plannedPaymentCount: 2 });

    await expect(validate(form, 'paymentSequence', 3)).rejects.toThrow('不能超过合同约定付款次数');
  });

  it('requires an instrument number for cheque payment', async () => {
    const form = paymentForm({ paymentMethod: 'CHEQUE' });

    await expect(validate(form, 'invoiceNumber', '')).rejects.toThrow('需填写票据号码');
    form.paymentMethod = 'CASH';
    await expect(validate(form, 'invoiceNumber', '')).resolves.toBeUndefined();
  });

  it('requires both warranty dates and validates their order', async () => {
    const form = paymentForm({ warrantyStartDate: '2026-07-01' });

    await expect(validate(form, 'warrantyStartDate', form.warrantyStartDate)).rejects.toThrow(
      '需同时填写',
    );
    form.warrantyEndDate = '2026-06-30';
    await expect(validate(form, 'warrantyEndDate', form.warrantyEndDate)).rejects.toThrow(
      '不能早于开始日期',
    );
  });
});

async function validate(
  form: ContractPaymentPayload,
  field: keyof ContractPaymentPayload,
  value: unknown,
): Promise<void> {
  const rule = createContractPaymentRules(form)[field].find((candidate) => candidate.validator);
  if (!rule?.validator) {
    throw new Error(`Missing validator for ${field}`);
  }
  await rule.validator(rule as Rule, value, () => undefined);
}

function paymentForm(overrides: Partial<ContractPaymentPayload> = {}): ContractPaymentPayload {
  return {
    contractId: 'contract-id',
    project: '测试合同',
    contractStartDate: '2026-01-01',
    contractEndDate: '2026-12-31',
    contractSigningDate: '2025-12-20',
    contractAmountCents: 100_000,
    budgetAmountCents: 100_000,
    budgetExecutedCents: 0,
    accountingSubject: '测试科目',
    maintenanceEstimateCents: null,
    counterpartyFullName: '测试单位',
    plannedPaymentCount: 1,
    paymentSequence: 1,
    executedAmountCents: 0,
    plannedProgress: '50',
    actualProgress: '50',
    paymentMethod: 'CASH',
    paymentReason: '测试付款',
    invoiceNumber: null,
    warrantyStartDate: null,
    warrantyEndDate: null,
    paymentAmountCents: 1,
    attachments: [],
    ...overrides,
  };
}
