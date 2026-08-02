import type { PortalReadingStatus, SessionUser } from '@oa/contracts';
import { describe, expect, it } from 'vitest';
import type { PortalRepository, PortalSeedData } from '../domain/portal.repository';
import type {
  PortalContent,
  PortalEvent,
  PortalLink,
  PortalReadReceipt,
  PortalVisibleContentQuery,
  PortalVisibleContentResult,
  PortalWidget,
} from '../domain/portal.types';
import { PortalQueryService } from './portal-query.service';

const now = new Date('2026-07-13T08:00:00.000Z');
const user: SessionUser = {
  id: 'user-reader',
  username: 'reader',
  displayName: '阅读人',
  departmentId: 'dept-business',
  departmentName: '业务部',
  roleCodes: ['APPLICANT'],
  permissionCodes: [],
  memberships: [],
  dataScopes: [],
};

function content(id: string, overrides: Partial<PortalContent> = {}): PortalContent {
  return {
    id,
    category: 'NOTICE',
    title: `通知 ${id}`,
    summary: '摘要',
    body: '<p>正文</p>',
    publisherId: 'publisher',
    publisherName: '办公室',
    publisherDepartmentId: 'dept-office',
    publisherDepartmentName: '办公室',
    audienceType: 'ALL',
    audienceIds: [],
    pinned: false,
    requiresReceipt: true,
    coverImageUrl: null,
    attachments: [],
    status: 'PUBLISHED',
    currentRevision: 1,
    publishedAt: new Date('2026-07-12T08:00:00.000Z'),
    offlineAt: null,
    withdrawnAt: null,
    createdAt: new Date('2026-07-11T08:00:00.000Z'),
    updatedAt: new Date('2026-07-12T08:00:00.000Z'),
    ...overrides,
  };
}

class MemoryPortalRepository implements PortalRepository {
  contents: PortalContent[] = [];
  receipts: PortalReadReceipt[] = [];
  events: PortalEvent[] = [];
  links: PortalLink[] = [];
  widgets: PortalWidget[] = [];
  eventQueries: Array<{ from: Date; until: Date }> = [];

  async findVisibleContents(query: PortalVisibleContentQuery): Promise<PortalVisibleContentResult> {
    const receiptByContent = new Map(
      this.receipts
        .filter((receipt) => receipt.userId === query.audience.userId)
        .map((receipt) => [receipt.contentId, receipt]),
    );
    const visible = this.contents
      .filter(
        (content) =>
          content.status === 'PUBLISHED' &&
          content.publishedAt !== null &&
          content.publishedAt <= query.at &&
          (!content.offlineAt || content.offlineAt > query.at) &&
          (!query.category || content.category === query.category) &&
          (query.requiresReceipt === undefined ||
            content.requiresReceipt === query.requiresReceipt) &&
          matchesAudience(content, query) &&
          (query.readingStatus === undefined ||
            query.readingStatus === 'ALL' ||
            (query.readingStatus === 'READ'
              ? receiptByContent.has(content.id)
              : !receiptByContent.has(content.id))),
      )
      .sort((left, right) => {
        if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
        return (
          (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0) ||
          right.id.localeCompare(left.id)
        );
      });
    const offset = query.offset ?? 0;
    const selected =
      query.limit === undefined
        ? visible.slice(offset)
        : visible.slice(offset, offset + query.limit);
    return {
      total: visible.length,
      unreadCount: visible.filter((content) => !receiptByContent.has(content.id)).length,
      items: selected.map((content) => ({
        content,
        receipt: receiptByContent.get(content.id) ?? null,
      })),
    };
  }

  async findContent(id: string): Promise<PortalContent | null> {
    return this.contents.find((item) => item.id === id) ?? null;
  }

  async findReceipts(contentIds: string[], userId: string): Promise<PortalReadReceipt[]> {
    return this.receipts.filter(
      (receipt) => receipt.userId === userId && contentIds.includes(receipt.contentId),
    );
  }

  async saveReadReceipt(contentId: string, userId: string, readAt: Date) {
    const existing = this.receipts.find(
      (receipt) => receipt.contentId === contentId && receipt.userId === userId,
    );
    if (existing) {
      return existing;
    }
    const receipt = { contentId, userId, readAt };
    this.receipts.push(receipt);
    return receipt;
  }

  async listEvents(from: Date, until: Date): Promise<PortalEvent[]> {
    this.eventQueries.push({ from, until });
    return this.events;
  }

  async listLinks(): Promise<PortalLink[]> {
    return this.links;
  }

  async listWidgets(): Promise<PortalWidget[]> {
    return this.widgets;
  }

  async seed(data: PortalSeedData): Promise<void> {
    this.contents.push(...data.contents);
  }
}

function matchesAudience(content: PortalContent, query: PortalVisibleContentQuery): boolean {
  if (content.audienceType === 'ALL') return true;
  if (content.audienceType === 'USER') return content.audienceIds.includes(query.audience.userId);
  if (content.audienceType === 'ROLE') {
    return content.audienceIds.some((id) => query.audience.roleCodes.includes(id));
  }
  return content.audienceIds.some((id) => query.audience.departmentIds.includes(id));
}

describe('PortalQueryService', () => {
  it('returns one audience-filtered home snapshot with user widget overrides', async () => {
    const repository = new MemoryPortalRepository();
    repository.contents = [
      content('all'),
      content('department', { audienceType: 'DEPARTMENT', audienceIds: ['dept-business'] }),
      content('hidden-role', { audienceType: 'ROLE', audienceIds: ['FINANCE_REVIEWER'] }),
      content('scheduled', {
        status: 'SCHEDULED',
        publishedAt: new Date('2026-07-14T08:00:00.000Z'),
      }),
    ];
    repository.receipts = [
      { contentId: 'all', userId: user.id, readAt: new Date('2026-07-12T10:00:00.000Z') },
    ];
    repository.widgets = [
      {
        ownerId: 'DEFAULT',
        widgetKey: 'CONTENT:NOTICE',
        title: '通知公告',
        displayOrder: 20,
        visible: true,
      },
      {
        ownerId: user.id,
        widgetKey: 'CONTENT:NOTICE',
        title: '我的通知',
        displayOrder: 5,
        visible: true,
      },
    ];
    repository.links = [
      {
        id: 'public-link',
        title: '工作台',
        url: '/workbench',
        icon: 'LayoutDashboard',
        requiredPermissionCodes: [],
        displayOrder: 1,
        active: true,
      },
      {
        id: 'admin-link',
        title: '表单设计',
        url: '/system/forms',
        icon: 'PanelsTopLeft',
        requiredPermissionCodes: ['FORM_DESIGN_VIEW'],
        displayOrder: 2,
        active: true,
      },
    ];

    const result = await new PortalQueryService(repository).getHome(user, now);

    expect(result.generatedAt).toBe(now.toISOString());
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0]).toMatchObject({
      title: '我的通知',
      displayOrder: 5,
      total: 2,
      unreadCount: 1,
    });
    expect(result.sections[0].items.map((item) => item.id)).toEqual(['department', 'all']);
    expect(result.sections[0].items.find((item) => item.id === 'all')?.read).toBe(true);
    expect(result.quickLinks.map((link) => link.id)).toEqual(['public-link']);
  });

  it('paginates one audience-filtered category with stable pinned/date/id ordering', async () => {
    const repository = new MemoryPortalRepository();
    repository.contents = [
      content('notice-a'),
      content('notice-b'),
      content('notice-pinned', { pinned: true, publishedAt: new Date('2026-07-01T08:00:00Z') }),
      content('notice-hidden', { audienceType: 'USER', audienceIds: ['another-user'] }),
      content('memo', { category: 'MEMO' }),
    ];
    const service = new PortalQueryService(repository);

    const first = await service.getContents(
      { category: 'NOTICE', page: 1, pageSize: 2 },
      user,
      now,
    );
    const second = await service.getContents(
      { category: 'NOTICE', page: 2, pageSize: 2 },
      user,
      now,
    );

    expect(first.total).toBe(3);
    expect(first.items.map((item) => item.id)).toEqual(['notice-pinned', 'notice-b']);
    expect(second.items.map((item) => item.id)).toEqual(['notice-a']);
  });

  it('loads a bounded hotel-local calendar range through the existing event repository', async () => {
    const repository = new MemoryPortalRepository();
    repository.events = [
      {
        id: 'event-1',
        title: '会议',
        startAt: new Date('2026-07-10T08:00:00.000Z'),
        endAt: new Date('2026-07-10T09:00:00.000Z'),
        allDay: false,
        location: '会议室',
        kind: 'MEETING',
        displayOrder: 1,
        active: true,
      },
    ];
    const service = new PortalQueryService(repository);

    const result = await service.getCalendar({ from: '2026-07-01', to: '2026-08-31' });

    expect(result).toMatchObject({ from: '2026-07-01', to: '2026-08-31' });
    expect(result.events.map((event) => event.id)).toEqual(['event-1']);
    expect(repository.eventQueries[0]).toEqual({
      from: new Date('2026-06-30T16:00:00.000Z'),
      until: new Date('2026-08-31T15:59:59.999Z'),
    });
    await expect(
      service.getCalendar({ from: '2026-07-01', to: '2026-09-01' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PORTAL_CALENDAR_QUERY_INVALID' }),
    });
  });

  it.each<[PortalReadingStatus, string[]]>([
    ['ALL', ['unread', 'read']],
    ['READ', ['read']],
    ['UNREAD', ['unread']],
  ])('filters receipt-required content by %s', async (status, expectedIds) => {
    const repository = new MemoryPortalRepository();
    repository.contents = [
      content('read'),
      content('unread'),
      content('informational', { requiresReceipt: false }),
    ];
    repository.receipts = [
      { contentId: 'read', userId: user.id, readAt: new Date('2026-07-12T10:00:00.000Z') },
    ];

    const result = await new PortalQueryService(repository).getReading({ status }, user, now);

    expect(result.items.map((item) => item.id)).toEqual(expectedIds);
    expect(result.total).toBe(expectedIds.length);
    expect(result).toMatchObject({ page: 1, pageSize: 20 });
  });

  it('rejects unknown reading states even outside the HTTP validation boundary', async () => {
    const repository = new MemoryPortalRepository();
    await expect(
      new PortalQueryService(repository).getReading(
        { status: 'UNKNOWN' as PortalReadingStatus },
        user,
        now,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PORTAL_READING_QUERY_INVALID' }),
    });
  });

  it('rechecks visibility for detail and preserves the first idempotent read time', async () => {
    const repository = new MemoryPortalRepository();
    repository.contents = [
      content('visible'),
      content('private', { audienceType: 'USER', audienceIds: ['another-user'] }),
    ];
    const service = new PortalQueryService(repository);

    const first = await service.markRead('visible', user, now);
    const second = await service.markRead('visible', user, new Date('2026-07-13T09:00:00.000Z'));

    expect(second).toEqual(first);
    await expect(service.getContent('private', user, now)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PORTAL_CONTENT_NOT_FOUND' }),
    });
  });
});
