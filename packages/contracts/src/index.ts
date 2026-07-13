export type DocumentStatus = 'DRAFT' | 'IN_REVIEW' | 'RETURNED' | 'APPROVED' | 'CANCELLED';

export type BusinessModule = 'CONTRACT' | 'SEAL' | 'SUPPLY';

export type DocumentType =
  | 'CONTRACT_REQUEST'
  | 'CONTRACT_APPROVAL'
  | 'CONTRACT_PAYMENT'
  | 'SEAL_BORROW'
  | 'SEAL_USE'
  | 'MATERIAL_PURCHASE'
  | 'MATERIAL_REQUISITION';

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  departmentId: string;
  departmentName: string;
  roleCodes: string[];
}

export interface ApprovalTaskSummary {
  id: string;
  documentId: string;
  documentType: DocumentType;
  documentTitle: string;
  currentStep: number;
  assigneeRole: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface ApprovalOpinion {
  id: string;
  action: 'SUBMIT' | 'APPROVE' | 'RETURN';
  comment: string;
  actorName: string;
  createdAt: string;
}

export interface ApiError {
  code: string;
  message: string;
  details: Record<string, unknown>;
  traceId: string;
}
