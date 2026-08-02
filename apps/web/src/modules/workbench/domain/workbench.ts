import type { DocumentStatus, DocumentType, WorkbenchBox } from '@oa/contracts';

export const documentStatusLabels: Record<DocumentStatus, string> = {
  DRAFT: '草稿',
  IN_REVIEW: '审批中',
  RETURNED: '已退回',
  APPROVED: '已通过',
  CANCELLED: '已取消',
};

export interface WorkbenchFilters {
  keyword: string;
  documentType: DocumentType | 'ALL';
  applicantId: string;
  departmentId: string;
  status: DocumentStatus | 'ALL';
  dateRange: string[];
}

export interface WorkbenchItemsRequest {
  box: WorkbenchBox;
  page: number;
  pageSize: number;
  keyword?: string;
  documentType?: DocumentType;
  applicantId?: string;
  departmentId?: string;
  status?: DocumentStatus;
  dateFrom?: string;
  dateTo?: string;
}

export function createEmptyWorkbenchFilters(): WorkbenchFilters {
  return {
    keyword: '',
    documentType: 'ALL',
    applicantId: '',
    departmentId: '',
    status: 'ALL',
    dateRange: [],
  };
}

export function copyWorkbenchFilters(source: WorkbenchFilters): WorkbenchFilters {
  return { ...source, dateRange: [...source.dateRange] };
}

export function createWorkbenchItemsRequest(
  box: WorkbenchBox,
  page: number,
  pageSize: number,
  filters: WorkbenchFilters,
): WorkbenchItemsRequest {
  const applicantBox = ['PENDING', 'COMPLETED', 'FOLLOWING', 'COPIED'].includes(box);
  const statusBox = ['MINE', 'FOLLOWING', 'COPIED'].includes(box);
  return {
    box,
    page,
    pageSize,
    keyword: filters.keyword.trim() || undefined,
    documentType: filters.documentType === 'ALL' ? undefined : filters.documentType,
    applicantId: applicantBox ? filters.applicantId || undefined : undefined,
    departmentId: filters.departmentId || undefined,
    status: statusBox && filters.status !== 'ALL' ? filters.status : undefined,
    dateFrom: filters.dateRange[0],
    dateTo: filters.dateRange[1],
  };
}
