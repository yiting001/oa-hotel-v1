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
} as const satisfies Record<BusinessModule, Record<BusinessPermissionAction, string>>;

export const DOCUMENT_TYPE_MODULES: Record<DocumentType, BusinessModule> = {
  CONTRACT_REQUEST: 'CONTRACT',
  CONTRACT_APPROVAL: 'CONTRACT',
  CONTRACT_PAYMENT: 'CONTRACT',
  SEAL_BORROW: 'SEAL',
  SEAL_USE: 'SEAL',
  MATERIAL_PURCHASE: 'SUPPLY',
  MATERIAL_REQUISITION: 'SUPPLY',
};

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
