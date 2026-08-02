import type { PortalAudienceType, PortalContentCategory, PortalContentStatus } from '@oa/contracts';

export interface PortalContentWriteInput {
  category?: PortalContentCategory;
  title?: string;
  summary?: string;
  body?: string;
  audienceType?: PortalAudienceType;
  audienceIds?: string[];
  pinned?: boolean;
  requiresReceipt?: boolean;
  coverImageUrl?: string | null;
  attachments?: string[];
  offlineAt?: string | null;
}

export interface PortalContentPublishInput {
  publishAt?: string | null;
}

export interface PortalContentAdminQueryInput {
  page?: number;
  pageSize?: number;
  status?: PortalContentStatus;
  category?: PortalContentCategory;
  keyword?: string;
}
