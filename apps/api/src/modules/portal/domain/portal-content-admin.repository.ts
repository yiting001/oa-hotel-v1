import type { PortalContentCategory, PortalContentStatus } from '@oa/contracts';
import type { PortalContent, PortalContentAudit, PortalContentRevision } from './portal.types';

export const PORTAL_CONTENT_ADMIN_REPOSITORY = Symbol('PORTAL_CONTENT_ADMIN_REPOSITORY');

export interface PortalContentAdminQuery {
  page: number;
  pageSize: number;
  status?: PortalContentStatus;
  category?: PortalContentCategory;
  keyword?: string;
}

export interface PortalContentAdminPageResult {
  total: number;
  items: PortalContent[];
}

export interface PortalContentMutationRecord {
  content: PortalContent;
  revision: PortalContentRevision;
  audit: PortalContentAudit;
  expectedRevision: number | null;
}

/** Persistence boundary for transactional content, revision and audit mutations. */
export interface PortalContentAdminRepository {
  list(query: PortalContentAdminQuery): Promise<PortalContentAdminPageResult>;
  findById(id: string): Promise<PortalContent | null>;
  commit(record: PortalContentMutationRecord): Promise<boolean>;
  listAudit(contentId: string): Promise<PortalContentAudit[]>;
  publishDueScheduled(at: Date): Promise<number>;
}
