import type { DocumentAttachmentItem } from '@oa/contracts';

export interface MaterialLossItem {
  id: string;
  lossId: string;
  sortOrder: number;
  name: string;
  specification: string;
  unit: string;
  quantity: number;
  unitPriceCents: number | null;
  subtotalCents: number;
  remark: string;
}

export type MaterialLossItemDraft = Omit<
  MaterialLossItem,
  'id' | 'lossId' | 'sortOrder' | 'subtotalCents'
>;

export interface MaterialLossData {
  id: string;
  number: string;
  applicantId: string;
  departmentId: string;
  applicationDate: string;
  reason: string;
  totalAmountCents: number;
  items: MaterialLossItem[];
  attachments: DocumentAttachmentItem[];
}

export type MaterialLossPayload = Omit<
  MaterialLossData,
  'id' | 'number' | 'applicantId' | 'departmentId' | 'items' | 'totalAmountCents'
> & {
  items: MaterialLossItemDraft[];
};
