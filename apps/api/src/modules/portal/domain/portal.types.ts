import {
  PORTAL_CONTENT_CATEGORIES,
  type PortalAudienceType,
  type PortalContentAuditAction,
  type PortalContentCategory,
  type PortalContentStatus,
  type PortalReadingStatus,
} from '@oa/contracts';

export const portalContentCategories = PORTAL_CONTENT_CATEGORIES;

export interface PortalContent {
  id: string;
  category: PortalContentCategory;
  title: string;
  summary: string;
  body: string;
  publisherId: string;
  publisherName: string;
  publisherDepartmentId: string | null;
  publisherDepartmentName: string | null;
  audienceType: PortalAudienceType;
  audienceIds: string[];
  pinned: boolean;
  requiresReceipt: boolean;
  coverImageUrl: string | null;
  attachments: string[];
  status: PortalContentStatus;
  currentRevision: number;
  publishedAt: Date | null;
  offlineAt: Date | null;
  withdrawnAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PortalContentListItem = Omit<PortalContent, 'body' | 'attachments'>;

export interface PortalAudienceContext {
  userId: string;
  roleCodes: string[];
  departmentIds: string[];
}

export interface PortalVisibleContentQuery {
  at: Date;
  audience: PortalAudienceContext;
  category?: PortalContentCategory;
  requiresReceipt?: boolean;
  readingStatus?: PortalReadingStatus;
  offset?: number;
  limit?: number;
}

export interface PortalVisibleContentItem {
  content: PortalContentListItem;
  receipt: PortalReadReceipt | null;
}

export interface PortalVisibleContentResult {
  total: number;
  unreadCount: number;
  items: PortalVisibleContentItem[];
}

export interface PortalReadReceipt {
  contentId: string;
  userId: string;
  readAt: Date;
}

export interface PortalEvent {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  location: string | null;
  kind: string;
  displayOrder: number;
  active: boolean;
}

export interface PortalLink {
  id: string;
  title: string;
  url: string;
  icon: string;
  requiredPermissionCodes: string[];
  displayOrder: number;
  active: boolean;
}

export interface PortalWidget {
  ownerId: string;
  widgetKey: string;
  title: string;
  displayOrder: number;
  visible: boolean;
}

export interface PortalContentRevisionSnapshot {
  id: string;
  category: PortalContentCategory;
  title: string;
  summary: string;
  body: string;
  publisherId: string;
  publisherName: string;
  publisherDepartmentId: string | null;
  publisherDepartmentName: string | null;
  audienceType: PortalAudienceType;
  audienceIds: string[];
  pinned: boolean;
  requiresReceipt: boolean;
  coverImageUrl: string | null;
  attachments: string[];
  status: PortalContentStatus;
  publishedAt: string | null;
  offlineAt: string | null;
  withdrawnAt: string | null;
}

export interface PortalContentRevision {
  id: string;
  contentId: string;
  revision: number;
  snapshot: PortalContentRevisionSnapshot;
  createdAt: Date;
}

export interface PortalContentAudit {
  id: string;
  contentId: string;
  action: PortalContentAuditAction;
  actorId: string;
  actorName: string;
  actorDepartmentName: string | null;
  revision: number;
  occurredAt: Date;
  details: Record<string, unknown>;
}
