export interface PurchaseItem {
  name: string;
  brand: string | null;
  specification: string;
  unit: string;
  requestedQuantity: string;
  monthlyConsumption: string;
  referenceUnitPriceCents: number;
  remark: string | null;
}

export interface RequisitionItem {
  materialItemId: string;
  itemCode: string;
  name: string;
  specification: string;
  unit: string;
  requestedQuantity: string;
  issuedQuantity: string | null;
  purpose: string;
}
