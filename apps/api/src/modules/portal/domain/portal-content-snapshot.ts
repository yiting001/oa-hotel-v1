import type { PortalContent, PortalContentRevisionSnapshot } from './portal.types';

/** Creates a detached value snapshot so later entity mutations cannot alter revision history. */
export function createPortalContentSnapshot(content: PortalContent): PortalContentRevisionSnapshot {
  return {
    id: content.id,
    category: content.category,
    title: content.title,
    summary: content.summary,
    body: content.body,
    publisherId: content.publisherId,
    publisherName: content.publisherName,
    publisherDepartmentId: content.publisherDepartmentId,
    publisherDepartmentName: content.publisherDepartmentName,
    audienceType: content.audienceType,
    audienceIds: [...content.audienceIds],
    pinned: content.pinned,
    requiresReceipt: content.requiresReceipt,
    coverImageUrl: content.coverImageUrl,
    attachments: [...content.attachments],
    status: content.status,
    publishedAt: content.publishedAt?.toISOString() ?? null,
    offlineAt: content.offlineAt?.toISOString() ?? null,
    withdrawnAt: content.withdrawnAt?.toISOString() ?? null,
  };
}
