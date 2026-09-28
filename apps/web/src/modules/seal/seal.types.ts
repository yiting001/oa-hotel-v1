import type { DocumentStatus } from '@oa/contracts';

export interface SealAsset {
  id: string;
  code: string;
  name: string;
  type: string;
  custodianUserId: string;
  status: string;
  activeBorrowRequestId: string | null;
  validUntil: string | null;
}

/** 线下《用印及借用证照申请单》的用章类别及数量。 */
export interface SealCategoryEntry {
  name: string;
  copies: number;
}

export interface SealBorrowInput {
  useDate: string;
  plannedReturnDate: string;
  companionIds: string[];
  destination: string;
  sealAssetNames: string[];
  content: string;
  submitTo: string;
  sealCategories: SealCategoryEntry[];
  sealTakeout: boolean;
  licenseTakeout: boolean;
  attachments: string[];
}

export interface SealBorrowRecord extends SealBorrowInput {
  id: string;
  number: string;
  applicantId: string;
  departmentId: string;
  applicationDate: string;
  executionStatus: string;
  actualRecipient: string | null;
  checkedOutAt: string | null;
  returnedAt: string | null;
  returnCondition: string | null;
  exceptionNote: string | null;
}

export interface SealUseInput {
  useDate: string;
  purpose: string;
  sealAssetNames: string[];
  content: string;
  submitTo: string;
  sealCategories: SealCategoryEntry[];
  sealTakeout: boolean;
  licenseTakeout: boolean;
  attachments: string[];
}

export interface SealUseRecord extends SealUseInput {
  id: string;
  number: string;
  applicantId: string;
  departmentId: string;
  applicationDate: string;
  executionStatus: string;
  stampedCopies: number | null;
  executedAt: string | null;
  archiveNumber: string | null;
  executionNote: string | null;
}

export interface SealDocumentEnvelope<T> {
  data: T;
  document: {
    id: string;
    documentType: string;
    title: string;
    status: DocumentStatus;
    revision: number;
  };
  opinions: Array<{
    id: string;
    action: string;
    actorName: string;
    comment: string;
    createdAt: string;
  }>;
}

export interface SealCheckoutInput {
  actualRecipient: string;
  checkedOutAt: string;
}

export interface SealReturnInput {
  returnedAt: string;
  returnCondition: string;
  exceptionNote: string | null;
}

export interface SealExecuteInput {
  stampedCopies: number;
  executedAt: string;
  archiveNumber: string;
  executionNote: string | null;
}
