import type {
  PortalAdminContentDetail,
  PortalAdminContentPage,
  PortalAudienceDirectory,
  PortalAudienceType,
  PortalContentAuditTrail,
  PortalContentCategory,
  PortalContentStatus,
} from '@oa/contracts';
import { apiRequest } from '../../../shared/api';

export interface PortalContentWritePayload {
  category: PortalContentCategory;
  title: string;
  summary: string;
  body: string;
  audienceType: PortalAudienceType;
  audienceIds: string[];
  pinned: boolean;
  requiresReceipt: boolean;
  coverImageUrl: string | null;
  attachments: string[];
  offlineAt: string | null;
}

export interface PortalAdminContentFilters {
  page: number;
  pageSize: number;
  status?: PortalContentStatus;
  category?: PortalContentCategory;
  keyword?: string;
}

export function loadPortalAdminContents(
  filters: PortalAdminContentFilters,
): Promise<PortalAdminContentPage> {
  const parameters = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
  });
  if (filters.status) parameters.set('status', filters.status);
  if (filters.category) parameters.set('category', filters.category);
  if (filters.keyword) parameters.set('keyword', filters.keyword);
  return apiRequest(`/portal/admin/contents?${parameters.toString()}`);
}

export function loadPortalAdminContent(id: string): Promise<PortalAdminContentDetail> {
  return apiRequest(`/portal/admin/contents/${id}`);
}

export function createPortalAdminContent(
  payload: PortalContentWritePayload,
): Promise<PortalAdminContentDetail> {
  return apiRequest('/portal/admin/contents', { method: 'POST', body: { ...payload } });
}

export function updatePortalAdminContent(
  id: string,
  payload: PortalContentWritePayload,
): Promise<PortalAdminContentDetail> {
  return apiRequest(`/portal/admin/contents/${id}`, { method: 'PATCH', body: { ...payload } });
}

export function publishPortalAdminContent(
  id: string,
  publishAt: string | null,
): Promise<PortalAdminContentDetail> {
  return apiRequest(`/portal/admin/contents/${id}/publish`, {
    method: 'POST',
    body: { publishAt },
  });
}

export function withdrawPortalAdminContent(id: string): Promise<PortalAdminContentDetail> {
  return apiRequest(`/portal/admin/contents/${id}/withdraw`, { method: 'POST' });
}

export function loadPortalContentAudit(id: string): Promise<PortalContentAuditTrail> {
  return apiRequest(`/portal/admin/contents/${id}/audit`);
}

export function loadPortalAudienceDirectory(): Promise<PortalAudienceDirectory> {
  return apiRequest('/portal/admin/audience-directory');
}
