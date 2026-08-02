import type { BusinessModule, DocumentStatus, DocumentType } from './core-types.js';

export const WORKFLOW_ROLE_LABELS: Readonly<Record<string, string>> = {
  APPLICANT: '申请人',
  APPLICANT_DEPARTMENT_MANAGER: '发起人部门负责人',
  DEPARTMENT_MANAGER: '部门总监',
  FINANCE_REVIEWER: '财务审核',
  OFFICE_REVIEWER: '办公室审核',
  SEAL_MANAGER: '印章管理员',
  PROCUREMENT: '采购经办',
  WAREHOUSE_MANAGER: '仓库管理员',
  DIRECT_USER: '指定办理人',
};

export const WORKBENCH_BOXES = [
  'PENDING',
  'COMPLETED',
  'MINE',
  'DRAFTS',
  'FOLLOWING',
  'COPIED',
] as const;

export type WorkbenchBox = (typeof WORKBENCH_BOXES)[number];

export interface WorkbenchSummary {
  generatedAt: string;
  counts: Record<WorkbenchBox, number>;
}

export interface WorkbenchItem {
  id: string;
  box: WorkbenchBox;
  taskId: string | null;
  documentId: string;
  documentType: DocumentType;
  module: BusinessModule;
  documentTitle: string;
  documentStatus: DocumentStatus;
  applicantId: string;
  applicantName: string;
  departmentId: string;
  departmentName: string;
  processNodeId: string | null;
  processNodeName: string | null;
  currentStep: number | null;
  assigneeRole: string | null;
  followedAt: string | null;
  copyId: string | null;
  copySenderId: string | null;
  copySenderName: string | null;
  copyReadAt: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkbenchPage {
  box: WorkbenchBox;
  page: number;
  pageSize: number;
  total: number;
  items: WorkbenchItem[];
}

export interface DocumentFollowState {
  documentId: string;
  following: boolean;
  followedAt: string | null;
}

export interface WorkflowCopyDelivery {
  id: string;
  documentId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  readAt: string | null;
  createdAt: string;
}

export interface WorkflowCopyCommandResult {
  documentId: string;
  deliveries: WorkflowCopyDelivery[];
}

export interface BatchApprovalItemResult {
  taskId: string;
  documentId: string | null;
  status: 'SUCCEEDED' | 'FAILED';
  code: string | null;
  message: string;
}

export interface BatchApprovalResult {
  requestId: string;
  total: number;
  succeeded: number;
  failed: number;
  results: BatchApprovalItemResult[];
}
