import type { FormItemRule } from 'element-plus';

/**
 * Element Plus 的 validator 类型要求回调式签名，而这里的校验器是 async 抛出式
 * （async-validator 运行时同样支持 Promise 拒绝）。统一用一个小包装做类型收敛，
 * 校验逻辑与其抛出的错误文案保持不变。
 */
const asValidator = (fn: (...args: never[]) => Promise<void>): FormItemRule['validator'] =>
  fn as unknown as FormItemRule['validator'];
import { PAYMENT_METHODS_REQUIRING_INSTRUMENT_NUMBER } from './contract.config';
import type { ContractPaymentPayload } from './contract.types';

export function createContractPaymentRules(
  form: ContractPaymentPayload,
): Record<keyof ContractPaymentPayload, FormItemRule[]> {
  return {
    contractId: [{ required: true, message: '请选择已审批合同' }],
    project: [{ required: true, whitespace: true, message: '请输入合同项目' }],
    contractStartDate: [{ required: true, message: '请选择合同开始日期' }],
    contractEndDate: [
      { required: true, message: '请选择合同结束日期' },
      { validator: asValidator(() => validateContractDates(form)), trigger: 'change' },
    ],
    contractSigningDate: [{ required: true, message: '缺少合同签订日期' }],
    contractAmountCents: [{ required: true, type: 'number', min: 0 }],
    budgetAmountCents: [
      { required: true, type: 'number', min: 0, message: '请输入有效的预算金额' },
    ],
    budgetExecutedCents: [
      { required: true, type: 'number', min: 0, message: '预算累计执行金额不能小于 0' },
    ],
    accountingSubject: [{ required: true, whitespace: true, message: '请输入会计科目' }],
    maintenanceEstimateCents: [{ type: 'number', min: 0, message: '预计保养费用不能小于 0' }],
    counterpartyFullName: [{ required: true, whitespace: true, message: '缺少乙方单位快照' }],
    plannedPaymentCount: [
      { required: true, type: 'integer', min: 1, message: '合同约定付款次数必须大于等于 1' },
    ],
    paymentSequence: [
      { required: true, type: 'integer', min: 1, message: '本次付款次序必须大于等于 1' },
      { validator: asValidator((_rule, value) => validatePaymentSequence(form, value)), trigger: 'change' },
    ],
    executedAmountCents: [
      { required: true, type: 'number', min: 0, message: '累计已执行合同金额不能小于 0' },
    ],
    plannedProgress: [
      { required: true, whitespace: true, message: '请输入合同约定进度' },
      { validator: asValidator(validateProgress), trigger: 'blur' },
    ],
    actualProgress: [
      { required: true, whitespace: true, message: '请输入实际进度' },
      { validator: asValidator(validateProgress), trigger: 'blur' },
    ],
    paymentMethod: [{ required: true, message: '请选择付款方式' }],
    paymentReason: [
      { required: true, whitespace: true, message: '请输入此次付款原因' },
      { max: 5000, message: '付款原因不能超过 5000 个字' },
    ],
    invoiceNumber: [
      { validator: asValidator((_rule, value) => validateInstrumentNumber(form, value)), trigger: 'blur' },
    ],
    warrantyStartDate: [{ validator: asValidator(() => validateWarrantyDates(form)), trigger: 'change' }],
    warrantyEndDate: [{ validator: asValidator(() => validateWarrantyDates(form)), trigger: 'change' }],
    paymentAmountCents: [
      { required: true, type: 'number', min: 1, message: '本次付款金额必须大于 0' },
      { validator: asValidator((_rule, value) => validatePaymentAmount(form, value)), trigger: 'change' },
    ],
    attachments: [],
  };
}

export function parsePaymentProgress(value: string): number | null {
  const parsed = Number(value.trim().replace('%', ''));
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null;
}

async function validateProgress(_rule: FormItemRule, value: unknown): Promise<void> {
  if (value && parsePaymentProgress(String(value)) === null) {
    throw new Error('进度必须是 0 到 100 之间的数值');
  }
}

async function validatePaymentSequence(
  form: ContractPaymentPayload,
  value: unknown,
): Promise<void> {
  if (Number(value) > form.plannedPaymentCount) {
    throw new Error('本次付款次序不能超过合同约定付款次数');
  }
}

async function validatePaymentAmount(form: ContractPaymentPayload, value: unknown): Promise<void> {
  const contractBalance = form.contractAmountCents - form.executedAmountCents;
  if (Number(value) > contractBalance) {
    throw new Error('本次付款金额不能超过未执行合同金额');
  }
  if (Number(value) > form.budgetAmountCents - form.budgetExecutedCents) {
    throw new Error('本次付款金额不能超过可用预算余额');
  }
}

async function validateContractDates(form: ContractPaymentPayload): Promise<void> {
  if (form.contractStartDate && form.contractEndDate < form.contractStartDate) {
    throw new Error('合同结束日期不能早于开始日期');
  }
}

async function validateWarrantyDates(form: ContractPaymentPayload): Promise<void> {
  const hasStart = Boolean(form.warrantyStartDate);
  const hasEnd = Boolean(form.warrantyEndDate);
  if (hasStart !== hasEnd) {
    throw new Error('保修期开始和结束日期需同时填写');
  }
  if (hasStart && form.warrantyEndDate! < form.warrantyStartDate!) {
    throw new Error('保修期结束日期不能早于开始日期');
  }
}

async function validateInstrumentNumber(
  form: ContractPaymentPayload,
  value: unknown,
): Promise<void> {
  const requiresNumber = PAYMENT_METHODS_REQUIRING_INSTRUMENT_NUMBER.includes(
    form.paymentMethod as (typeof PAYMENT_METHODS_REQUIRING_INSTRUMENT_NUMBER)[number],
  );
  if (requiresNumber && !String(value ?? '').trim()) {
    throw new Error('当前付款方式需填写票据号码');
  }
}
