import type { ApiEnvelope } from '../../shared/api';

export interface MaterialItem {
  id: string;
  code: string;
  name: string;
  specification: string;
  unit: string;
  availableQuantity: string;
  active: boolean;
}

export interface PurchaseLineForm {
  key: string;
  name: string;
  brand: string;
  specification: string;
  unit: string;
  requestedQuantity: number | null;
  monthlyConsumption: number | null;
  referenceUnitPriceCents: number | null;
  remark: string;
}

export interface PurchaseLineDto {
  name: string;
  brand: string | null;
  specification: string;
  unit: string;
  requestedQuantity: string;
  monthlyConsumption: string;
  referenceUnitPriceCents: number;
  remark: string | null;
}

export interface PurchaseRequestRecord {
  id: string;
  number: string;
  applicantId: string;
  departmentId: string;
  applicationDate: string;
  items: PurchaseLineDto[];
  taxableUnitPriceTotalCents: number;
  taxableAmountTotalCents: number;
}

export interface PurchaseRequestPayload extends Record<string, unknown> {
  applicationDate: string;
  items: PurchaseLineDto[];
}

export interface RequisitionLineForm {
  key: string;
  materialItemId: string;
  requestedQuantity: number | null;
  purpose: string;
}

export interface RequisitionLineDto {
  materialItemId: string;
  requestedQuantity: string;
  purpose: string;
}

export interface RequisitionLineRecord extends RequisitionLineDto {
  itemCode: string;
  name: string;
  specification: string;
  unit: string;
  issuedQuantity: string | null;
}

export interface MaterialRequisitionRecord {
  id: string;
  number: string;
  applicantId: string;
  departmentId: string;
  contactUserId: string;
  applicationDate: string;
  items: RequisitionLineRecord[];
  attachments: string[];
  issueStatus: 'NOT_ISSUED' | 'PARTIALLY_ISSUED' | 'ISSUED' | string;
  issuedAt: string | null;
  issuedBy: string | null;
}

export interface MaterialRequisitionPayload extends Record<string, unknown> {
  applicationDate: string;
  contactUserId: string;
  items: RequisitionLineDto[];
  attachments: string[];
}

export interface IssueLineForm {
  materialItemId: string;
  issuedQuantity: number | null;
  issuedAt: string;
}

export interface IssuePayload extends Record<string, unknown> {
  issuedAt: string;
  items: Array<{ materialItemId: string; issuedQuantity: string }>;
}

export type PurchaseEnvelope = ApiEnvelope<PurchaseRequestRecord>;
export type RequisitionEnvelope = ApiEnvelope<MaterialRequisitionRecord>;

export type FieldErrors = Record<string, string>;
