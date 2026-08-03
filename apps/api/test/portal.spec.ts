import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type {
  PortalAdminContentDetail,
  PortalAdminContentPage,
  PortalAudienceDirectory,
  PortalCalendarResponse,
  PortalContentAuditTrail,
  PortalContentDetail,
  PortalContentPage,
  PortalHomeResponse,
  PortalReadReceiptResult,
  PortalReadingResponse,
  SessionUser,
} from '@oa/contracts';
import request from 'supertest';
import type { Repository } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ApiExceptionFilter } from '../src/common/errors/api-exception.filter';
import { UserEntity } from '../src/common/auth/user.entity';
import { PortalCalendarEventEntity } from '../src/modules/portal/infrastructure/portal-calendar-event.entity';
import { PortalContentEntity } from '../src/modules/portal/infrastructure/portal-content.entity';

interface LoginResponse {
  accessToken: string;
  user: SessionUser;
}

describe('公司门户 HTTP 集成', () => {
  const originalDemoSeed = process.env.OA_DEMO_SEED;
  let app: INestApplication;
  let moduleRef: TestingModule;
  let server: Parameters<typeof request>[0];
  const sessions = new Map<string, LoginResponse>();

  beforeAll(async () => {
    process.env.OA_DATABASE_PATH = ':memory:';
    process.env.JWT_SECRET = 'portal-test-secret';
    process.env.OA_DEMO_PASSWORD = 'Demo123!';
    process.env.OA_DEMO_SEED = 'true';
    const { AppModule } = await import('../src/app.module');
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    await seedPortalPaginationRows();
    server = app.getHttpServer() as Parameters<typeof request>[0];

    for (const username of ['applicant', 'office', 'portal-no-permission']) {
      const response = await request(server)
        .post('/api/v1/auth/login')
        .send({ username, password: 'Demo123!' })
        .expect(201);
      sessions.set(username, response.body as LoginResponse);
    }
  }, 30_000);

  afterAll(async () => {
    await app?.close();
    if (originalDemoSeed === undefined) {
      delete process.env.OA_DEMO_SEED;
    } else {
      process.env.OA_DEMO_SEED = originalDemoSeed;
    }
  });

  it('returns seven configured summary sections without loading content bodies', async () => {
    const response = await request(server)
      .get('/api/v1/portal/home')
      .auth(token('applicant'), { type: 'bearer' })
      .expect(200);
    const home = response.body as PortalHomeResponse;

    expect(session('applicant').user.permissionCodes).toEqual(
      expect.arrayContaining(['PORTAL_VIEW', 'CONTENT_VIEW']),
    );
    expect(home.sections).toHaveLength(7);
    expect(home.calendarEvents).toHaveLength(4);
    expect(home.quickLinks.map((link) => link.url)).toEqual([
      '/workbench',
      '/contract',
      '/seal',
      '/supply',
    ]);
    expect(home.widgets).toHaveLength(10);
    expect(home.sections.find((section) => section.key === 'EVENT')?.items).not.toHaveLength(0);
    expect(home.sections.find((section) => section.key === 'COMPANY_NEWS')).toMatchObject({
      total: 9,
    });
    expect(home.sections.find((section) => section.key === 'COMPANY_NEWS')?.items).toHaveLength(6);
    expect(home.sections.flatMap((section) => section.items)[0]).not.toHaveProperty('body');

    const officeResponse = await request(server)
      .get('/api/v1/portal/home')
      .auth(token('office'), { type: 'bearer' })
      .expect(200);
    expect((officeResponse.body as PortalHomeResponse).quickLinks.map((link) => link.url)).toEqual([
      '/workbench',
      '/contract',
      '/seal',
    ]);
  });

  it('applies department, role, and explicit-user audiences to home and direct detail access', async () => {
    const applicantIds = await visibleContentIds('applicant');
    const officeIds = await visibleContentIds('office');

    expect(applicantIds).toEqual(
      expect.arrayContaining(['portal-notice-business-duty', 'portal-party-learning']),
    );
    expect(applicantIds).not.toContain('portal-minutes-office');
    expect(applicantIds).not.toContain('portal-memo-office-archive');
    expect(officeIds).toEqual(
      expect.arrayContaining(['portal-minutes-office', 'portal-memo-office-archive']),
    );
    expect(officeIds).not.toContain('portal-notice-business-duty');
    expect(officeIds).not.toContain('portal-party-learning');

    const hidden = await request(server)
      .get('/api/v1/portal/contents/portal-memo-office-archive')
      .auth(token('applicant'), { type: 'bearer' })
      .expect(404);
    expect(hidden.body.code).toBe('PORTAL_CONTENT_NOT_FOUND');
  });

  it('filters required reading and records the first read time idempotently', async () => {
    const unreadBefore = await reading('applicant', 'UNREAD');
    expect(unreadBefore.items.map((item) => item.id)).toContain('portal-notice-training');
    expect(unreadBefore).toMatchObject({ page: 1, pageSize: 20 });
    const firstPage = await reading('applicant', 'UNREAD', 1, 1);
    const secondPage = await reading('applicant', 'UNREAD', 2, 1);
    expect(firstPage.total).toBeGreaterThan(1);
    expect(firstPage.items[0]?.id).not.toBe(secondPage.items[0]?.id);

    const first = await markRead('applicant', 'portal-notice-training');
    const second = await markRead('applicant', 'portal-notice-training');
    expect(second).toEqual(first);

    const read = await reading('applicant', 'READ');
    const unreadAfter = await reading('applicant', 'UNREAD');
    expect(read.items.map((item) => item.id)).toContain('portal-notice-training');
    expect(unreadAfter.items.map((item) => item.id)).not.toContain('portal-notice-training');

    const detailResponse = await request(server)
      .get('/api/v1/portal/contents/portal-notice-training')
      .auth(token('applicant'), { type: 'bearer' })
      .expect(200);
    const detail = detailResponse.body as PortalContentDetail;
    expect(detail.body).toContain('培训对象');
    expect(detail.readAt).toBe(first.readAt);
  });

  it('paginates the complete visible category and preserves audience isolation', async () => {
    const first = await contentPage('applicant', 'COMPANY_NEWS', 1, 3);
    const second = await contentPage('applicant', 'COMPANY_NEWS', 2, 3);
    const applicantMemo = await contentPage('applicant', 'MEMO', 1, 20);
    const officeMemo = await contentPage('office', 'MEMO', 1, 20);

    expect(first.total).toBe(9);
    expect(second.total).toBe(9);
    expect(first.items).toHaveLength(3);
    expect(second.items).toHaveLength(3);
    expect(first.items.map((item) => item.id)).not.toEqual(second.items.map((item) => item.id));
    expect(applicantMemo.items.map((item) => item.id)).not.toContain('portal-memo-office-archive');
    expect(officeMemo.items.map((item) => item.id)).toContain('portal-memo-office-archive');
  });

  it('loads calendar events for a requested month window and enforces its limits', async () => {
    const response = await request(server)
      .get(`/api/v1/portal/calendar?from=${futureWindowFrom()}&to=${futureWindowTo()}`)
      .auth(token('applicant'), { type: 'bearer' })
      .expect(200);
    const calendar = response.body as PortalCalendarResponse;

    expect(calendar.events.map((event) => event.id)).toContain('portal-calendar-future');
    const tooWide = await request(server)
      .get('/api/v1/portal/calendar?from=2026-07-01&to=2026-09-01')
      .auth(token('applicant'), { type: 'bearer' })
      .expect(400);
    expect(tooWide.body.code).toBe('PORTAL_CALENDAR_QUERY_INVALID');
  });

  it('requires current portal/content permissions for category and calendar endpoints', async () => {
    await request(server)
      .get('/api/v1/portal/contents?category=NOTICE')
      .auth(token('portal-no-permission'), { type: 'bearer' })
      .expect(403);
    await request(server)
      .get('/api/v1/portal/calendar?from=2026-09-01&to=2026-09-30')
      .auth(token('portal-no-permission'), { type: 'bearer' })
      .expect(403);
  });

  it('enforces content-management permission and exposes the existing IAM audience directory', async () => {
    expect(session('office').user.permissionCodes).toContain('CONTENT_MANAGE');
    await request(server)
      .get('/api/v1/portal/admin/contents')
      .auth(token('applicant'), { type: 'bearer' })
      .expect(403);

    const listResponse = await request(server)
      .get('/api/v1/portal/admin/contents?page=1&pageSize=50')
      .auth(token('office'), { type: 'bearer' })
      .expect(200);
    const list = listResponse.body as PortalAdminContentPage;
    expect(new Set(list.items.map((item) => item.status))).toEqual(
      new Set(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'WITHDRAWN']),
    );

    const directoryResponse = await request(server)
      .get('/api/v1/portal/admin/audience-directory')
      .auth(token('office'), { type: 'bearer' })
      .expect(200);
    const directory = directoryResponse.body as PortalAudienceDirectory;
    expect(directory.departments.map((item) => item.id)).toContain('dept-office');
    expect(directory.roles.map((item) => item.code)).toContain('OFFICE_REVIEWER');
    expect(directory.users.map((item) => item.id)).toContain('user-applicant');
  });

  it('creates, publishes, revises and withdraws content with immutable audit chronology', async () => {
    const createdResponse = await request(server)
      .post('/api/v1/portal/admin/contents')
      .auth(token('office'), { type: 'bearer' })
      .send({
        category: 'EVENT',
        title: 'HTTP 宴会统筹测试',
        summary: '用于验证内容运营闭环。',
        body: '<p>初版正文</p>',
        audienceType: 'ALL',
        audienceIds: [],
        pinned: false,
        requiresReceipt: true,
        coverImageUrl: null,
        attachments: ['宴会清单.xlsx'],
        offlineAt: null,
      })
      .expect(201);
    const created = createdResponse.body as PortalAdminContentDetail;
    expect(created).toMatchObject({ status: 'DRAFT', currentRevision: 1 });

    const publishedResponse = await request(server)
      .post(`/api/v1/portal/admin/contents/${created.id}/publish`)
      .auth(token('office'), { type: 'bearer' })
      .send({ publishAt: null })
      .expect(201);
    expect(publishedResponse.body).toMatchObject({ status: 'PUBLISHED', currentRevision: 2 });

    const revisedResponse = await request(server)
      .patch(`/api/v1/portal/admin/contents/${created.id}`)
      .auth(token('office'), { type: 'bearer' })
      .send({ title: 'HTTP 宴会统筹测试（修订）', body: '<p>修订正文</p>' })
      .expect(200);
    expect(revisedResponse.body).toMatchObject({ status: 'PUBLISHED', currentRevision: 3 });

    const auditResponse = await request(server)
      .get(`/api/v1/portal/admin/contents/${created.id}/audit`)
      .auth(token('office'), { type: 'bearer' })
      .expect(200);
    const audit = auditResponse.body as PortalContentAuditTrail;
    expect(audit.events.map((event) => event.action)).toEqual(['UPDATED', 'PUBLISHED', 'CREATED']);
    expect(audit.events.map((event) => event.revision)).toEqual([3, 2, 1]);

    const withdrawnResponse = await request(server)
      .post(`/api/v1/portal/admin/contents/${created.id}/withdraw`)
      .auth(token('office'), { type: 'bearer' })
      .expect(201);
    expect(withdrawnResponse.body).toMatchObject({ status: 'WITHDRAWN', currentRevision: 4 });
  });

  it('round-trips a future publication instant without shifting the hotel-local selection', async () => {
    const created = (
      await request(server)
        .post('/api/v1/portal/admin/contents')
        .auth(token('office'), { type: 'bearer' })
        .send({
          category: 'NOTICE',
          title: 'HTTP 定时发布测试',
          summary: '摘要',
          body: '<p>正文</p>',
          audienceType: 'ALL',
          audienceIds: [],
        })
        .expect(201)
    ).body as PortalAdminContentDetail;
    const response = await request(server)
      .post(`/api/v1/portal/admin/contents/${created.id}/publish`)
      .auth(token('office'), { type: 'bearer' })
      .send({ publishAt: '2099-07-15T01:30:00.000Z' })
      .expect(201);

    expect(response.body).toMatchObject({
      status: 'SCHEDULED',
      publishedAt: '2099-07-15T01:30:00.000Z',
    });
  });

  it('rejects unsupported reading filters at the HTTP boundary', async () => {
    await request(server)
      .get('/api/v1/portal/reading?status=UNKNOWN')
      .auth(token('applicant'), { type: 'bearer' })
      .expect(400);
    await request(server)
      .get('/api/v1/portal/contents?category=UNKNOWN')
      .auth(token('applicant'), { type: 'bearer' })
      .expect(400);
    await request(server)
      .get('/api/v1/portal/reading?status=UNREAD&pageSize=101')
      .auth(token('applicant'), { type: 'bearer' })
      .expect(400);
  });

  async function seedPortalPaginationRows(): Promise<void> {
    const contents = moduleRef.get<Repository<PortalContentEntity>>(
      getRepositoryToken(PortalContentEntity),
    );
    const events = moduleRef.get<Repository<PortalCalendarEventEntity>>(
      getRepositoryToken(PortalCalendarEventEntity),
    );
    const users = moduleRef.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
    const applicant = await users.findOneByOrFail({ id: 'user-applicant' });
    await users.save({
      ...applicant,
      id: 'user-portal-no-permission',
      username: 'portal-no-permission',
      displayName: '无门户权限用户',
      roleCodes: [],
    });
    await contents.save(
      Array.from({ length: 7 }, (_, index) => ({
        id: `portal-page-news-${String(index + 1).padStart(2, '0')}`,
        category: 'COMPANY_NEWS' as const,
        title: `门户分页新闻 ${index + 1}`,
        summary: '用于验证栏目更多分页。',
        body: '<p>栏目分页测试正文。</p>',
        publisherId: 'user-office',
        publisherName: '办公室管理员',
        publisherDepartmentId: 'dept-office',
        publisherDepartmentName: '办公室',
        audienceType: 'ALL' as const,
        audienceIds: [],
        pinned: false,
        requiresReceipt: false,
        coverImageUrl: null,
        attachments: [],
        status: 'PUBLISHED' as const,
        currentRevision: 1,
        publishedAt: new Date('2026-07-10T08:00:00.000Z'),
        offlineAt: null,
        withdrawnAt: null,
        createdAt: new Date('2026-07-09T08:00:00.000Z'),
        updatedAt: new Date('2026-07-10T08:00:00.000Z'),
      })),
    );
    await events.save({
      id: 'portal-calendar-future',
      title: '远期经营复盘会',
      startAt: futureEventStart(),
      endAt: new Date(futureEventStart().getTime() + 2 * 60 * 60 * 1000),
      allDay: false,
      location: '第一会议室',
      kind: 'MEETING',
      displayOrder: 1,
      active: true,
    });
  }

  function futureEventStart(): Date {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + 60);
    start.setUTCHours(2, 0, 0, 0);
    return start;
  }

  function isoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  function futureWindowFrom(): string {
    const from = futureEventStart();
    from.setUTCDate(from.getUTCDate() - 5);
    return isoDate(from);
  }

  function futureWindowTo(): string {
    const to = futureEventStart();
    to.setUTCDate(to.getUTCDate() + 5);
    return isoDate(to);
  }

  async function visibleContentIds(username: string): Promise<string[]> {
    const response = await request(server)
      .get('/api/v1/portal/home')
      .auth(token(username), { type: 'bearer' })
      .expect(200);
    const home = response.body as PortalHomeResponse;
    return home.sections.flatMap((section) => section.items.map((item) => item.id));
  }

  async function reading(username: string, status: 'UNREAD' | 'READ', page = 1, pageSize = 20) {
    const response = await request(server)
      .get(`/api/v1/portal/reading?status=${status}&page=${page}&pageSize=${pageSize}`)
      .auth(token(username), { type: 'bearer' })
      .expect(200);
    return response.body as PortalReadingResponse;
  }

  async function contentPage(
    username: string,
    category: string,
    page: number,
    pageSize: number,
  ): Promise<PortalContentPage> {
    const response = await request(server)
      .get(`/api/v1/portal/contents?category=${category}&page=${page}&pageSize=${pageSize}`)
      .auth(token(username), { type: 'bearer' })
      .expect(200);
    return response.body as PortalContentPage;
  }

  async function markRead(username: string, contentId: string) {
    const response = await request(server)
      .post(`/api/v1/portal/contents/${contentId}/read`)
      .auth(token(username), { type: 'bearer' })
      .expect(201);
    return response.body as PortalReadReceiptResult;
  }

  function token(username: string): string {
    return session(username).accessToken;
  }

  function session(username: string): LoginResponse {
    const value = sessions.get(username);
    if (!value) {
      throw new Error(`missing session for ${username}`);
    }
    return value;
  }
});
