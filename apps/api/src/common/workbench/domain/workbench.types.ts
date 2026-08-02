import type { BusinessModule, DocumentStatus, DocumentType, WorkbenchBox } from '@oa/contracts';

export interface WorkbenchQuery {
  box: WorkbenchBox;
  page: number;
  pageSize: number;
  keyword: string | null;
  documentType: DocumentType | null;
  applicantId: string | null;
  departmentId: string | null;
  status: DocumentStatus | null;
  dateFrom: Date | null;
  dateTo: Date | null;
}

export interface WorkbenchQueryInput {
  box?: unknown;
  page?: unknown;
  pageSize?: unknown;
  keyword?: unknown;
  documentType?: unknown;
  applicantId?: unknown;
  departmentId?: unknown;
  status?: unknown;
  dateFrom?: unknown;
  dateTo?: unknown;
}

export interface WorkbenchRepositoryContext {
  userId: string;
  allowedModules: BusinessModule[];
  canApprove: boolean;
  canFollow: boolean;
  moduleScopes: Partial<Record<BusinessModule, WorkbenchResourceScope>>;
}

export interface WorkbenchResourceScope {
  all: boolean;
  self: boolean;
  departmentIds: string[];
}
