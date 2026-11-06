import type { DocumentAttachmentItem, DocumentStatus } from '@oa/contracts';

export interface ContractRequestData {
  id: string;
  number: string;
  title: string;
  departmentId: string;
  applicantId: string;
  requestedAt: string;
  amountCents: number | null;
  content: string;
  /** 内部请示的致送单位。 */
  addressee: string;
  /** 内部请示的发出部门。 */
  issuer: string;
  /** 上传附件（带 id 可下载）与历史文件名混排。 */
  attachments: DocumentAttachmentItem[];
}

export type ContractRequestPayload = Pick<
  ContractRequestData,
  'title' | 'requestedAt' | 'amountCents' | 'content' | 'addressee' | 'issuer' | 'attachments'
>;

export interface ContractApprovalData {
  id: string;
  number: string;
  requestId: string | null;
  signingDepartmentId: string;
  signingDate: string;
  name: string;
  amountCents: number;
  counterpartyFullName: string;
  counterpartyContact: string | null;
  counterpartyPhone: string | null;
  validFrom: string | null;
  validTo: string | null;
  contentReason: string;
  remark: string | null;
  /** 用印类型：CONTRACT_SEAL=合同章，OFFICIAL_SEAL=公章，空表示不需要用印。 */
  sealType: string | null;
  /** 遗留下单开关，仅历史数据可能为 true。 */
  needsSeal: boolean;
  applicantId: string;
  /** 上传附件（带 id 可下载）与历史文件名混排。 */
  attachments: DocumentAttachmentItem[];
}

export type ContractApprovalPayload = Pick<
  ContractApprovalData,
  | 'requestId'
  | 'signingDepartmentId'
  | 'signingDate'
  | 'name'
  | 'amountCents'
  | 'counterpartyFullName'
  | 'counterpartyContact'
  | 'counterpartyPhone'
  | 'validFrom'
  | 'validTo'
  | 'contentReason'
  | 'remark'
  | 'sealType'
  | 'attachments'
>;

export interface ContractPaymentData {
  id: string;
  number: string;
  contractId: string;
  applicantId: string;
  departmentId: string;
  project: string;
  contractStartDate: string;
  contractEndDate: string;
  contractSigningDate: string;
  contractAmountCents: number;
  budgetAmountCents: number;
  budgetExecutedCents: number;
  accountingSubject: string;
  maintenanceEstimateCents: number | null;
  counterpartyFullName: string;
  plannedPaymentCount: number;
  paymentSequence: number;
  executedAmountCents: number;
  remainingAmountCents: number;
  plannedProgress: string;
  actualProgress: string;
  progressVariance: string;
  paymentMethod: string;
  paymentReason: string;
  invoiceNumber: string | null;
  warrantyStartDate: string | null;
  warrantyEndDate: string | null;
  paymentAmountCents: number;
  paymentAmountUppercase: string;
  attachments: string[];
}

export type ContractPaymentPayload = Pick<
  ContractPaymentData,
  | 'contractId'
  | 'project'
  | 'contractStartDate'
  | 'contractEndDate'
  | 'contractSigningDate'
  | 'contractAmountCents'
  | 'budgetAmountCents'
  | 'budgetExecutedCents'
  | 'accountingSubject'
  | 'maintenanceEstimateCents'
  | 'counterpartyFullName'
  | 'plannedPaymentCount'
  | 'paymentSequence'
  | 'executedAmountCents'
  | 'plannedProgress'
  | 'actualProgress'
  | 'paymentMethod'
  | 'paymentReason'
  | 'invoiceNumber'
  | 'warrantyStartDate'
  | 'warrantyEndDate'
  | 'paymentAmountCents'
  | 'attachments'
>;

export interface DocumentMeta {
  status: DocumentStatus | null;
  revision: number | null;
}

export type EditorMode = 'create' | 'edit';
