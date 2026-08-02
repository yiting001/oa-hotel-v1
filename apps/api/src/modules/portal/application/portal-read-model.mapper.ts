import type {
  PortalCalendarEvent,
  PortalContentDetail,
  PortalContentSummary,
  PortalQuickLink,
  PortalWidgetConfig,
} from '@oa/contracts';
import type {
  PortalContent,
  PortalContentListItem,
  PortalEvent,
  PortalLink,
  PortalReadReceipt,
  PortalWidget,
} from '../domain/portal.types';

export function toPortalContentSummary(
  content: PortalContentListItem,
  receipt?: PortalReadReceipt,
): PortalContentSummary {
  return {
    id: content.id,
    category: content.category,
    title: content.title,
    summary: content.summary,
    publisherName: content.publisherName,
    publisherDepartmentName: content.publisherDepartmentName,
    publishedAt: requiredPublishedAt(content).toISOString(),
    pinned: content.pinned,
    requiresReceipt: content.requiresReceipt,
    read: Boolean(receipt),
    coverImageUrl: content.coverImageUrl,
  };
}

function requiredPublishedAt(content: PortalContentListItem): Date {
  if (!content.publishedAt) {
    throw new Error(`Published portal content ${content.id} has no publication date`);
  }
  return content.publishedAt;
}

export function toPortalContentDetail(
  content: PortalContent,
  receipt?: PortalReadReceipt,
): PortalContentDetail {
  return {
    ...toPortalContentSummary(content, receipt),
    body: content.body,
    attachments: content.attachments,
    readAt: receipt?.readAt.toISOString() ?? null,
  };
}

export function toPortalCalendarEvent(event: PortalEvent): PortalCalendarEvent {
  return {
    id: event.id,
    title: event.title,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    allDay: event.allDay,
    location: event.location,
    kind: event.kind,
  };
}

export function toPortalQuickLink(link: PortalLink): PortalQuickLink {
  return {
    id: link.id,
    title: link.title,
    url: link.url,
    icon: link.icon,
    displayOrder: link.displayOrder,
  };
}

export function toPortalWidgetConfig(widget: PortalWidget): PortalWidgetConfig {
  return {
    key: widget.widgetKey,
    title: widget.title,
    displayOrder: widget.displayOrder,
    visible: widget.visible,
  };
}
