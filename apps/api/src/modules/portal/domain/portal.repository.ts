import type {
  PortalContent,
  PortalEvent,
  PortalLink,
  PortalReadReceipt,
  PortalWidget,
  PortalVisibleContentQuery,
  PortalVisibleContentResult,
} from './portal.types';

export const PORTAL_REPOSITORY = Symbol('PORTAL_REPOSITORY');

export interface PortalSeedData {
  contents: PortalContent[];
  events: PortalEvent[];
  links: PortalLink[];
  widgets: PortalWidget[];
}

/** Persistence boundary for the portal read model and idempotent read receipts. */
export interface PortalRepository {
  findVisibleContents(query: PortalVisibleContentQuery): Promise<PortalVisibleContentResult>;
  findContent(id: string): Promise<PortalContent | null>;
  findReceipts(contentIds: string[], userId: string): Promise<PortalReadReceipt[]>;
  saveReadReceipt(contentId: string, userId: string, readAt: Date): Promise<PortalReadReceipt>;
  listEvents(from: Date, until: Date): Promise<PortalEvent[]>;
  listLinks(): Promise<PortalLink[]>;
  listWidgets(userId: string): Promise<PortalWidget[]>;
  seed(data: PortalSeedData): Promise<void>;
}
