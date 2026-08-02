import { PortalCalendarEventEntity } from './portal-calendar-event.entity';
import { PortalContentEntity } from './portal-content.entity';
import { PortalContentAuditEntity } from './portal-content-audit.entity';
import { PortalContentRevisionEntity } from './portal-content-revision.entity';
import { PortalQuickLinkEntity } from './portal-quick-link.entity';
import { PortalReadReceiptEntity } from './portal-read-receipt.entity';
import { PortalWidgetEntity } from './portal-widget.entity';

export const portalEntities = [
  PortalContentEntity,
  PortalContentRevisionEntity,
  PortalContentAuditEntity,
  PortalReadReceiptEntity,
  PortalCalendarEventEntity,
  PortalQuickLinkEntity,
  PortalWidgetEntity,
];

export {
  PortalCalendarEventEntity,
  PortalContentEntity,
  PortalContentAuditEntity,
  PortalContentRevisionEntity,
  PortalQuickLinkEntity,
  PortalReadReceiptEntity,
  PortalWidgetEntity,
};
