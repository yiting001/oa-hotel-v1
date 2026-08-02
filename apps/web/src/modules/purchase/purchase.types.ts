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
  applicantId: string;
  departmentId: string;
  attachments: string[];
}

export type PurchasePayload = Omit<PurchaseData, 'id' | 'number' | 'applicantId' | 'departmentId'>;
