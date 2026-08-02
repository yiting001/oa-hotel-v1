import type {
  PortalAdminContentDetail,
  PortalAdminContentSummary,
  PortalContentAuditEvent,
} from '@oa/contracts';
import type { PortalContent, PortalContentAudit } from '../domain/portal.types';

export function toPortalAdminContentSummary(content: PortalContent): PortalAdminContentSummary {
  return {
    id: content.id,
    category: content.category,
    title: content.title,
    summary: content.summary,
    publisherId: content.publisherId,
    publisherName: content.publisherName,
    publisherDepartmentId: content.publisherDepartmentId,
    publisherDepartmentName: content.publisherDepartmentName,
    audienceType: content.audienceType,
    audienceIds: content.audienceIds,
    pinned: content.pinned,
    requiresReceipt: content.requiresReceipt,
    coverImageUrl: content.coverImageUrl,
    status: content.status,
    currentRevision: content.currentRevision,
    publishedAt: content.publishedAt?.toISOString() ?? null,
    offlineAt: content.offlineAt?.toISOString() ?? null,
    withdrawnAt: content.withdrawnAt?.toISOString() ?? null,
    createdAt: content.createdAt.toISOString(),
    updatedAt: content.updatedAt.toISOString(),
  };
}

export function toPortalAdminContentDetail(content: PortalContent): PortalAdminContentDetail {
  return {
    ...toPortalAdminContentSummary(content),
    body: content.body,
    attachments: content.attachments,
  };
}

export function toPortalContentAuditEvent(audit: PortalContentAudit): PortalContentAuditEvent {
  return {
    id: audit.id,
    contentId: audit.contentId,
    action: audit.action,
    actorId: audit.actorId,
    actorName: audit.actorName,
    actorDepartmentName: audit.actorDepartmentName,
    revision: audit.revision,
    occurredAt: audit.occurredAt.toISOString(),
    details: audit.details,
  };
}
