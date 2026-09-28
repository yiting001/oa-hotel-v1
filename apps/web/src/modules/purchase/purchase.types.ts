/** 采购申请单明细：品名 / 规格 / 订购数量 / 单价 / 总价。 */
export interface PurchaseItem {
  id: string;
  purchaseId: string;
  name: string;
  specification: string;
  unit: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
}

export type PurchaseItemDraft = Omit<PurchaseItem, 'id' | 'purchaseId' | 'subtotalCents'>;

export interface PurchaseData {
  id: string;
  number: string;
  name: string;
  amountCents: number;
  counterpartyName: string;
  counterpartyContact: string | null;
  counterpartyPhone: string | null;
  paymentMethod: string | null;
  expectedDeliveryDate: string | null;
  remark: string | null;
  itemCategory: string;
  budgetType: string;
  subtotalCents: number;
  tariffCents: number;
  vatCents: number;
  otherFeesCents: number;
  reason: string;
  handlerName: string;
  supplierA: string;
  supplierB: string;
  supplierC: string;
  requiredDate: string | null;
  purchaseOrderNo: string;
  items: PurchaseItem[];
  applicantId: string;
  departmentId: string;
  attachments: string[];
}

export type PurchasePayload = Omit<PurchaseData, 'id' | 'number' | 'applicantId' | 'departmentId' | 'items'> & {
  items: PurchaseItemDraft[];
};
