import type { PortalAudienceType, PortalContentCategory } from './core-types.js';

export const PORTAL_CONTENT_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'WITHDRAWN'] as const;

export type PortalContentStatus = (typeof PORTAL_CONTENT_STATUSES)[number];

export const PORTAL_CONTENT_AUDIT_ACTIONS = [
  'CREATED',
  'UPDATED',
  'SCHEDULED',
  'PUBLISHED',
  'WITHDRAWN',
] as const;

export type PortalContentAuditAction = (typeof PORTAL_CONTENT_AUDIT_ACTIONS)[number];

export interface PortalAdminContentSummary {
  id: string;
  category: PortalContentCategory;
  title: string;
  summary: string;
  publisherId: string;
  publisherName: string;
  publisherDepartmentId: string | null;
  publisherDepartmentName: string | null;
  audienceType: PortalAudienceType;
  audienceIds: string[];
  pinned: boolean;
  requiresReceipt: boolean;
  coverImageUrl: string | null;
  status: PortalContentStatus;
  currentRevision: number;
  publishedAt: string | null;
  offlineAt: string | null;
  withdrawnAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortalAdminContentDetail extends PortalAdminContentSummary {
  body: string;
  attachments: string[];
}

export interface PortalAdminContentPage {
  page: number;
  pageSize: number;
  total: number;
  items: PortalAdminContentSummary[];
}

export interface PortalContentAuditEvent {
  id: string;
  contentId: string;
  action: PortalContentAuditAction;
  actorId: string;
  actorName: string;
  actorDepartmentName: string | null;
  revision: number;
  occurredAt: string;
  details: Record<string, unknown>;
}

export interface PortalContentAuditTrail {
  contentId: string;
  events: PortalContentAuditEvent[];
}

export interface PortalAudienceDepartment {
  id: string;
  name: string;
  parentId: string | null;
  active: boolean;
}

export interface PortalAudienceRole {
  code: string;
  name: string;
  active: boolean;
}

export interface PortalAudienceUser {
  id: string;
  username: string;
  displayName: string;
  departmentIds: string[];
  active: boolean;
}

export interface PortalAudienceDirectory {
  departments: PortalAudienceDepartment[];
  roles: PortalAudienceRole[];
  users: PortalAudienceUser[];
}
