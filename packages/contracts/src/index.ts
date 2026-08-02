import type {
  BusinessModule,
  BusinessPermissionAction,
  DataScope,
  DocumentStatus,
  DocumentType,
  PortalContentCategory,
} from './core-types.js';

export * from './core-types.js';

export const BUSINESS_MODULE_PERMISSIONS = {
  CONTRACT: { CREATE: 'CONTRACT_CREATE', VIEW: 'CONTRACT_VIEW' },
  SEAL: { CREATE: 'SEAL_CREATE', VIEW: 'SEAL_VIEW' },
  SUPPLY: { CREATE: 'SUPPLY_CREATE', VIEW: 'SUPPLY_VIEW' },
  PURCHASE: { CREATE: 'PURCHASE_CREATE', VIEW: 'PURCHASE_VIEW' },
  PETTY: { CREATE: 'PETTY_CREATE', VIEW: 'PETTY_VIEW' },
} as const satisfies Record<BusinessModule, Record<BusinessPermissionAction, string>>;

export const DOCUMENT_TYPE_MODULES: Record<DocumentType, BusinessModule> = {
  CONTRACT_REQUEST: 'CONTRACT',
  CONTRACT_APPROVAL: 'CONTRACT',
  CONTRACT_PAYMENT: 'CONTRACT',
  SEAL_BORROW: 'SEAL',
  SEAL_USE: 'SEAL',
  MATERIAL_PURCHASE: 'SUPPLY',
  MATERIAL_REQUISITION: 'SUPPLY',
  PURCHASE_APPROVAL: 'PURCHASE',
  PETTY_PROCUREMENT: 'PETTY',
};

/** 单据编号规则：前缀 + 发起日期(yyyyMMdd) + 3 位流水号，例如 HT20260727001。 */
export const DOCUMENT_NUMBER_PREFIXES: Partial<Record<DocumentType, string>> = {
  CONTRACT_APPROVAL: 'HT',
  PURCHASE_APPROVAL: 'CG',
  PETTY_PROCUREMENT: 'LX',
};

/** 采购审批体系的六类业务角色。 */
export const PROCUREMENT_ROLE_LABELS = {
  INITIATOR: '发起人',
  ADMIN_APPROVER: '行政审批人',
  BUSINESS_APPROVER: '商务审批人',
  CATERING_APPROVER: '餐饮审批人',
  EXEC_PRE_APPROVER: '高管预审批',
  EXEC_APPROVER: '高管审批',
} as const;

export type ProcurementRoleCode = keyof typeof PROCUREMENT_ROLE_LABELS;

export const PROCUREMENT_APPROVER_ROLES: readonly ProcurementRoleCode[] = [
  'ADMIN_APPROVER',
  'BUSINESS_APPROVER',
  'CATERING_APPROVER',
  'EXEC_PRE_APPROVER',
  'EXEC_APPROVER',
];

export function requiredBusinessModulePermissions(
  module: BusinessModule,
  action: BusinessPermissionAction,
): string[] {
  return [`DOCUMENT_${action}`, BUSINESS_MODULE_PERMISSIONS[module][action]];
}

export function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === 'string' && Object.hasOwn(DOCUMENT_TYPE_MODULES, value);
}

export function requiredBusinessDocumentPermissions(
  documentType: DocumentType,
  action: BusinessPermissionAction,
): string[] {
  return requiredBusinessModulePermissions(DOCUMENT_TYPE_MODULES[documentType], action);
}

export interface OrganizationMembership {
  id: string;
  departmentId: string;
  departmentName: string;
  positionId: string | null;
  positionName: string | null;
  isPrimary: boolean;
  isDepartmentHead: boolean;
  active: boolean;
}

export interface DataScopeGrant {
  roleCode: string;
  permissionCodes: string[];
  scope: DataScope;
  scopeDepartmentId: string | null;
}

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  departmentId: string;
  departmentName: string;
  roleCodes: string[];
  permissionCodes: string[];
  memberships: OrganizationMembership[];
  dataScopes: DataScopeGrant[];
  /** Always returned by authentication APIs; optional keeps legacy test/session fixtures compatible. */
  passwordChangeRequired?: boolean;
}

export interface DirectoryUser {
  id: string;
  username: string;
  displayName: string;
  departmentId: string;
  departmentName: string;
}

export interface ApprovalTaskSummary {
  id: string;
  documentId: string;
  documentType: DocumentType;
  documentTitle: string;
  currentStep: number;
  processNodeId: string | null;
  processNodeName: string | null;
  assigneeRole: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalOpinion {
  id: string;
  action: 'SUBMIT' | 'APPROVE' | 'RETURN';
  comment: string;
  actorName: string;
  actorDepartmentName: string | null;
  actorPositionName: string | null;
  processNodeName: string | null;
  createdAt: string;
}

export interface DocumentSummary {
  id: string;
  documentType: DocumentType;
  module: BusinessModule;
  title: string;
  applicantId: string;
  departmentId: string;
  status: DocumentStatus;
  documentNo: string | null;
  revision: number;
  currentStep: number | null;
  workflowCode: string;
  processVersionId: string | null;
  formVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowDefinitionSummary {
  code: string;
  name: string;
  version: number;
  processVersionId: string | null;
  steps: string[];
}

export interface PublishedProcessSummary {
  documentType: DocumentType;
  processCode: string;
  processName: string;
  version: number;
  approvalPath: string[];
}

export interface WorkflowOverview {
  document: DocumentSummary;
  definition: WorkflowDefinitionSummary;
  currentTask: ApprovalTaskSummary | null;
  opinions: ApprovalOpinion[];
}

export interface DocumentPrintTemplate {
  formVersionId: string;
  definitionCode: string;
  definitionName: string;
  version: number;
  schemaJson: Record<string, unknown>;
  printSchemaJson: Record<string, unknown>;
}

export interface ApiError {
  code: string;
  message: string;
  details: Record<string, unknown>;
  traceId: string;
}

export type PortalReadingStatus = 'ALL' | 'UNREAD' | 'READ';

export interface PortalContentSummary {
  id: string;
  category: PortalContentCategory;
  title: string;
  summary: string;
  publisherName: string;
  publisherDepartmentName: string | null;
  publishedAt: string;
  pinned: boolean;
  requiresReceipt: boolean;
  read: boolean;
  coverImageUrl: string | null;
}

export interface PortalContentDetail extends PortalContentSummary {
  body: string;
  attachments: string[];
  readAt: string | null;
}

export interface PortalSection {
  key: PortalContentCategory;
  title: string;
  displayOrder: number;
  total: number;
  unreadCount: number;
  items: PortalContentSummary[];
}

export interface PortalCalendarEvent {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  location: string | null;
  kind: string;
}

export interface PortalQuickLink {
  id: string;
  title: string;
  url: string;
  icon: string;
  displayOrder: number;
}

export interface PortalWidgetConfig {
  key: string;
  title: string;
  displayOrder: number;
  visible: boolean;
}

export interface PortalHomeResponse {
  generatedAt: string;
  sections: PortalSection[];
  calendarEvents: PortalCalendarEvent[];
  quickLinks: PortalQuickLink[];
  widgets: PortalWidgetConfig[];
}

export interface PortalReadingResponse {
  status: PortalReadingStatus;
  page: number;
  pageSize: number;
  total: number;
  items: PortalContentSummary[];
}

export interface PortalContentPage {
  category: PortalContentCategory;
  page: number;
  pageSize: number;
  total: number;
  items: PortalContentSummary[];
}

export interface PortalCalendarResponse {
  from: string;
  to: string;
  events: PortalCalendarEvent[];
}

export interface PortalReadReceiptResult {
  contentId: string;
  readAt: string;
}

export * from './portal-operations.js';
export * from './workbench-collaboration.js';
