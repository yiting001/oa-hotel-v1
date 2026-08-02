import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import type {
  PortalContentCategory,
  PortalContentDetail,
  PortalContentPage,
  PortalCalendarResponse,
  PortalHomeResponse,
  PortalReadReceiptResult,
  PortalReadingResponse,
  PortalSection,
  SessionUser,
} from '@oa/contracts';
import { PORTAL_REPOSITORY, type PortalRepository } from '../domain/portal.repository';
import {
  PORTAL_CONTENT_ADMIN_REPOSITORY,
  type PortalContentAdminRepository,
} from '../domain/portal-content-admin.repository';
import {
  portalContentCategories,
  type PortalAudienceContext,
  type PortalWidget,
} from '../domain/portal.types';
import { PortalVisibilityPolicy } from '../domain/portal-visibility.policy';
import {
  toPortalCalendarEvent,
  toPortalContentDetail,
  toPortalContentSummary,
  toPortalQuickLink,
  toPortalWidgetConfig,
} from './portal-read-model.mapper';
import {
  normalizePortalCalendarQuery,
  normalizePortalContentListQuery,
  normalizePortalReadingQuery,
  type PortalCalendarQueryInput,
  type PortalContentListQueryInput,
  type PortalReadingQueryInput,
} from './portal-query.input';

const DEFAULT_WIDGET_OWNER = 'DEFAULT';
const CONTENT_WIDGET_PREFIX = 'CONTENT:';
const HOME_SECTION_ITEM_LIMIT = 6;
const CALENDAR_HORIZON_DAYS = 45;
const categories = new Set<string>(portalContentCategories);

@Injectable()
export class PortalQueryService {
  private readonly visibility = new PortalVisibilityPolicy();

  constructor(
    @Inject(PORTAL_REPOSITORY)
    private readonly repository: PortalRepository,
    @Optional()
    @Inject(PORTAL_CONTENT_ADMIN_REPOSITORY)
    private readonly contentAdmin?: PortalContentAdminRepository,
  ) {}

  async getHome(user: SessionUser, at = new Date()): Promise<PortalHomeResponse> {
    await this.promoteDue(at);
    const until = new Date(at);
    until.setUTCDate(until.getUTCDate() + CALENDAR_HORIZON_DAYS);
    const [calendarEvents, quickLinks, configuredWidgets] = await Promise.all([
      this.repository.listEvents(at, until),
      this.repository.listLinks(),
      this.repository.listWidgets(user.id),
    ]);
    const widgets = this.resolveWidgets(configuredWidgets, user.id);

    return {
      generatedAt: at.toISOString(),
      sections: await this.buildSections(widgets, user, at),
      calendarEvents: calendarEvents.map(toPortalCalendarEvent),
      quickLinks: quickLinks
        .filter((link) =>
          link.requiredPermissionCodes.every((code) => user.permissionCodes.includes(code)),
        )
        .map(toPortalQuickLink),
      widgets: widgets.map(toPortalWidgetConfig),
    };
  }

  async getContents(
    input: PortalContentListQueryInput,
    user: SessionUser,
    at = new Date(),
  ): Promise<PortalContentPage> {
    await this.promoteDue(at);
    const query = normalizePortalContentListQuery(input);
    const result = await this.repository.findVisibleContents({
      at,
      audience: this.audienceContext(user),
      category: query.category,
      offset: (query.page - 1) * query.pageSize,
      limit: query.pageSize,
    });
    return {
      category: query.category,
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
      items: result.items.map(({ content, receipt }) =>
        toPortalContentSummary(content, receipt ?? undefined),
      ),
    };
  }

  async getCalendar(input: PortalCalendarQueryInput): Promise<PortalCalendarResponse> {
    const query = normalizePortalCalendarQuery(input);
    const events = await this.repository.listEvents(query.fromAt, query.toAt);
    return {
      from: query.from,
      to: query.to,
      events: events.map(toPortalCalendarEvent),
    };
  }

  async getReading(
    input: PortalReadingQueryInput,
    user: SessionUser,
    at = new Date(),
  ): Promise<PortalReadingResponse> {
    await this.promoteDue(at);
    const query = normalizePortalReadingQuery(input);
    const result = await this.repository.findVisibleContents({
      at,
      audience: this.audienceContext(user),
      requiresReceipt: true,
      readingStatus: query.status,
      offset: (query.page - 1) * query.pageSize,
      limit: query.pageSize,
    });

    return {
      status: query.status,
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
      items: result.items.map(({ content, receipt }) =>
        toPortalContentSummary(content, receipt ?? undefined),
      ),
    };
  }

  async getContent(id: string, user: SessionUser, at = new Date()): Promise<PortalContentDetail> {
    await this.promoteDue(at);
    const content = await this.findVisibleContent(id, user, at);
    const [receipt] = await this.repository.findReceipts([id], user.id);
    return toPortalContentDetail(content, receipt);
  }

  async markRead(id: string, user: SessionUser, at = new Date()): Promise<PortalReadReceiptResult> {
    await this.promoteDue(at);
    await this.findVisibleContent(id, user, at);
    const receipt = await this.repository.saveReadReceipt(id, user.id, at);
    return { contentId: receipt.contentId, readAt: receipt.readAt.toISOString() };
  }

  private async findVisibleContent(id: string, user: SessionUser, at: Date) {
    const content = await this.repository.findContent(id);
    if (!content || !this.visibility.isVisible(content, user, at)) {
      throw new NotFoundException({
        code: 'PORTAL_CONTENT_NOT_FOUND',
        message: '门户内容不存在或当前不可见',
      });
    }
    return content;
  }

  private resolveWidgets(widgets: PortalWidget[], userId: string): PortalWidget[] {
    const resolved = new Map<string, PortalWidget>();
    for (const widget of widgets.filter((item) => item.ownerId === DEFAULT_WIDGET_OWNER)) {
      resolved.set(widget.widgetKey, widget);
    }
    for (const widget of widgets.filter((item) => item.ownerId === userId)) {
      resolved.set(widget.widgetKey, widget);
    }
    return [...resolved.values()].sort((left, right) => left.displayOrder - right.displayOrder);
  }

  private async buildSections(
    widgets: PortalWidget[],
    user: SessionUser,
    at: Date,
  ): Promise<PortalSection[]> {
    const configured = widgets.flatMap((widget) => {
      const category = this.getWidgetCategory(widget);
      return widget.visible && category ? [{ widget, category }] : [];
    });
    const audience = this.audienceContext(user);
    return Promise.all(
      configured.map(async ({ widget, category }) => {
        const result = await this.repository.findVisibleContents({
          at,
          audience,
          category,
          offset: 0,
          limit: HOME_SECTION_ITEM_LIMIT,
        });
        return {
          key: category,
          title: widget.title,
          displayOrder: widget.displayOrder,
          total: result.total,
          unreadCount: result.unreadCount,
          items: result.items.map(({ content, receipt }) =>
            toPortalContentSummary(content, receipt ?? undefined),
          ),
        };
      }),
    );
  }

  private getWidgetCategory(widget: PortalWidget): PortalContentCategory | null {
    if (!widget.widgetKey.startsWith(CONTENT_WIDGET_PREFIX)) {
      return null;
    }
    const value = widget.widgetKey.slice(CONTENT_WIDGET_PREFIX.length);
    return categories.has(value) ? (value as PortalContentCategory) : null;
  }

  private audienceContext(user: SessionUser): PortalAudienceContext {
    const activeDepartmentIds = user.memberships
      .filter((membership) => membership.active)
      .map((membership) => membership.departmentId);
    return {
      userId: user.id,
      roleCodes: [...new Set(user.roleCodes)],
      departmentIds: [
        ...new Set(activeDepartmentIds.length > 0 ? activeDepartmentIds : [user.departmentId]),
      ],
    };
  }

  private async promoteDue(at: Date): Promise<void> {
    await this.contentAdmin?.publishDueScheduled(at);
  }
}
