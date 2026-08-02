import type {
  FieldErrors,
  IssueLineForm,
  MaterialItem,
  MaterialRequisitionPayload,
  MaterialRequisitionRecord,
  PurchaseLineDto,
  PurchaseLineForm,
  PurchaseRequestPayload,
  PurchaseRequestRecord,
  RequisitionLineForm,
} from '../types';

function lineKey(): string {
  return crypto.randomUUID();
}

export function createPurchaseLine(): PurchaseLineForm {
  return {
    key: lineKey(),
    name: '',
    brand: '',
    specification: '',
    unit: '',
    requestedQuantity: null,
    monthlyConsumption: null,
    referenceUnitPriceCents: null,
    remark: '',
  };
}

export function createRequisitionLine(): RequisitionLineForm {
  return {
    key: lineKey(),
    materialItemId: '',
    requestedQuantity: null,
    purpose: '',
  };
}

export function hydratePurchaseLines(record: PurchaseRequestRecord): PurchaseLineForm[] {
  return record.items.map((item) => ({
    key: lineKey(),
    name: item.name,
    brand: item.brand ?? '',
    specification: item.specification,
    unit: item.unit,
    requestedQuantity: Number(item.requestedQuantity),
    monthlyConsumption: Number(item.monthlyConsumption),
    referenceUnitPriceCents: item.referenceUnitPriceCents,
    remark: item.remark ?? '',
  }));
}

export function hydrateRequisitionLines(record: MaterialRequisitionRecord): RequisitionLineForm[] {
  return record.items.map((item) => ({
    key: lineKey(),
    materialItemId: item.materialItemId,
    requestedQuantity: Number(item.requestedQuantity),
    purpose: item.purpose,
  }));
}

export function purchaseTotals(lines: PurchaseLineForm[]): {
  unitPriceTotalCents: number;
  amountTotalCents: number;
} {
  return lines.reduce(
    (total, line) => {
      const price = line.referenceUnitPriceCents ?? 0;
      const quantity = line.requestedQuantity ?? 0;
      total.unitPriceTotalCents += price;
      total.amountTotalCents += Math.round(price * quantity);
      return total;
    },
    { unitPriceTotalCents: 0, amountTotalCents: 0 },
  );
}

export function validatePurchase(applicationDate: string, lines: PurchaseLineForm[]): FieldErrors {
  const errors: FieldErrors = {};
  if (!applicationDate) {
    errors.applicationDate = '请选择申购日期';
  }
  if (lines.length === 0) {
    errors.items = '至少保留一条申购明细';
  }
  lines.forEach((line, index) => {
    requiredText(errors, index, 'name', line.name, '请输入品名');
    requiredText(errors, index, 'specification', line.specification, '请输入规格型号');
    requiredText(errors, index, 'unit', line.unit, '请输入单位');
    positiveNumber(errors, index, 'requestedQuantity', line.requestedQuantity, '申购数量');
    nonNegativeNumber(errors, index, 'monthlyConsumption', line.monthlyConsumption, '月消耗数量');
    nonNegativeNumber(
      errors,
      index,
      'referenceUnitPriceCents',
      line.referenceUnitPriceCents,
      '参考单价',
    );
  });
  return errors;
}

export function toPurchasePayload(
  applicationDate: string,
  lines: PurchaseLineForm[],
): PurchaseRequestPayload {
  return {
    applicationDate,
    items: lines.map<PurchaseLineDto>((line) => ({
      name: line.name.trim(),
      brand: nullableText(line.brand),
      specification: line.specification.trim(),
      unit: line.unit.trim(),
      requestedQuantity: String(line.requestedQuantity),
      monthlyConsumption: String(line.monthlyConsumption),
      referenceUnitPriceCents: line.referenceUnitPriceCents ?? 0,
      remark: nullableText(line.remark),
    })),
  };
}

export function validateRequisition(
  applicationDate: string,
  contactUserId: string,
  lines: RequisitionLineForm[],
): FieldErrors {
  const errors: FieldErrors = {};
  if (!applicationDate) {
    errors.applicationDate = '请选择填写日期';
  }
  if (!contactUserId) {
    errors.contactUserId = '请选择联系人';
  }
  if (lines.length === 0) {
    errors.items = '至少保留一条领用明细';
  }
  const selected = new Set<string>();
  lines.forEach((line, index) => {
    if (!line.materialItemId) {
      errors[fieldKey(index, 'materialItemId')] = '请选择库存物资';
    } else if (selected.has(line.materialItemId)) {
      errors[fieldKey(index, 'materialItemId')] = '同一物资请合并为一条明细';
    } else {
      selected.add(line.materialItemId);
    }
    positiveNumber(errors, index, 'requestedQuantity', line.requestedQuantity, '请领数量');
    requiredText(errors, index, 'purpose', line.purpose, '请输入用途');
  });
  return errors;
}

export function toRequisitionPayload(
  applicationDate: string,
  contactUserId: string,
  lines: RequisitionLineForm[],
  attachments: string[],
): MaterialRequisitionPayload {
  return {
    applicationDate,
    contactUserId,
    items: lines.map((line) => ({
      materialItemId: line.materialItemId,
      requestedQuantity: String(line.requestedQuantity),
      purpose: line.purpose.trim(),
    })),
    attachments,
  };
}

export function createIssueLines(record: MaterialRequisitionRecord): IssueLineForm[] {
  return record.items.map((item) => ({
    materialItemId: item.materialItemId,
    issuedQuantity: null,
    issuedAt: '',
  }));
}

export function validateIssue(
  lines: IssueLineForm[],
  record: MaterialRequisitionRecord,
  inventory: MaterialItem[],
): FieldErrors {
  const errors: FieldErrors = {};
  const inventoryMap = new Map(inventory.map((item) => [item.id, Number(item.availableQuantity)]));
  let issuedLineCount = 0;
  lines.forEach((line, index) => {
    nonNegativeNumber(errors, index, 'issuedQuantity', line.issuedQuantity, '实发数量');
    if ((line.issuedQuantity ?? 0) > 0) {
      issuedLineCount += 1;
    }
    const requested = Number(record.items[index]?.requestedQuantity ?? 0);
    if ((line.issuedQuantity ?? 0) > requested) {
      errors[fieldKey(index, 'issuedQuantity')] = '实发数量不能超过请领数量';
    }
    const available = inventoryMap.get(line.materialItemId);
    if (available !== undefined && (line.issuedQuantity ?? 0) > available) {
      errors[fieldKey(index, 'issuedQuantity')] = '实发数量不能超过当前可用库存';
    }
    if (!line.issuedAt) {
      errors[fieldKey(index, 'issuedAt')] = '请填写实发时间';
    }
  });
  if (issuedLineCount === 0) {
    errors.items = '至少一条明细的实发数量必须大于 0';
  }
  const timestamps = new Set(lines.map((line) => line.issuedAt).filter(Boolean));
  if (timestamps.size > 1) {
    errors.issuedAt = '当前后端仅支持整单一次登记，各明细实发时间必须一致';
  }
  return errors;
}

export function fieldKey(index: number, field: string): string {
  return `items.${index}.${field}`;
}

function requiredText(
  errors: FieldErrors,
  index: number,
  field: string,
  value: string,
  message: string,
): void {
  if (!value.trim()) {
    errors[fieldKey(index, field)] = message;
  }
}

function positiveNumber(
  errors: FieldErrors,
  index: number,
  field: string,
  value: number | null,
  label: string,
): void {
  if (value === null || !Number.isFinite(value) || value <= 0) {
    errors[fieldKey(index, field)] = `${label}必须大于 0`;
  }
}

function nonNegativeNumber(
  errors: FieldErrors,
  index: number,
  field: string,
  value: number | null,
  label: string,
): void {
  if (value === null || !Number.isFinite(value) || value < 0) {
    errors[fieldKey(index, field)] = `${label}不能小于 0`;
  }
}

function nullableText(value: string): string | null {
  const normalized = value.trim();
  return normalized || null;
}
