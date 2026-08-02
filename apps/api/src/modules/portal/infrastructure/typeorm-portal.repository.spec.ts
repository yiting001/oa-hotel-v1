import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PORTAL_REPOSITORY, type PortalRepository } from '../domain/portal.repository';
import type { PortalSeedData } from '../domain/portal.repository';
import { portalEntities } from './entities';
import { PortalReadModel1784200000000 } from './migrations/1784200000000-PortalReadModel';
import { PortalContentOperations1784300000000 } from './migrations/1784300000000-PortalContentOperations';
import { TypeOrmPortalRepository } from './typeorm-portal.repository';

const now = new Date('2026-07-13T08:00:00.000Z');

class PortalPermissionPrerequisites1784199999999 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "iam_permissions" (
        "id" text PRIMARY KEY NOT NULL, "code" text NOT NULL, "name" text NOT NULL,
        "module" text NOT NULL, "description" text, "active" boolean NOT NULL DEFAULT (1)
      )`,
    );
    await queryRunner.query(`CREATE TABLE "iam_roles" ("id" text PRIMARY KEY NOT NULL)`);
    await queryRunner.query(
      `CREATE TABLE "iam_role_permissions" (
        "roleId" text NOT NULL, "permissionId" text NOT NULL,
        PRIMARY KEY ("roleId", "permissionId")
      )`,
    );
    await queryRunner.query(`INSERT INTO "iam_roles" ("id") VALUES ('role-reader')`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "iam_role_permissions"`);
    await queryRunner.query(`DROP TABLE "iam_roles"`);
    await queryRunner.query(`DROP TABLE "iam_permissions"`);
  }
}

function seedData(): PortalSeedData {
  return {
    contents: [
      {
        id: 'published',
        category: 'NOTICE',
        title: '已发布',
        summary: '摘要',
        body: '正文',
        publisherId: 'publisher',
        publisherName: '发布人',
        publisherDepartmentId: null,
        publisherDepartmentName: null,
        audienceType: 'ALL',
        audienceIds: [],
        pinned: true,
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
      },
      {
        id: 'scheduled',
        category: 'NOTICE',
        title: '定时发布',
        summary: '摘要',
        body: '正文',
        publisherId: 'publisher',
        publisherName: '发布人',
        publisherDepartmentId: null,
        publisherDepartmentName: null,
        audienceType: 'ALL',
        audienceIds: [],
        pinned: false,
        requiresReceipt: false,
        coverImageUrl: null,
        attachments: [],
        status: 'SCHEDULED',
        currentRevision: 1,
        publishedAt: new Date('2026-07-14T08:00:00.000Z'),
        offlineAt: null,
        withdrawnAt: null,
        createdAt: new Date('2026-07-11T08:00:00.000Z'),
        updatedAt: new Date('2026-07-12T08:00:00.000Z'),
      },
    ],
    events: [
      {
        id: 'event-1',
        title: '会议',
        startAt: new Date('2026-07-14T08:00:00.000Z'),
        endAt: new Date('2026-07-14T09:00:00.000Z'),
        allDay: false,
        location: '会议室',
        kind: 'MEETING',
        displayOrder: 1,
        active: true,
      },
    ],
    links: [
      {
        id: 'link-1',
        title: '工作台',
        url: '/workbench',
        icon: 'LayoutDashboard',
        requiredPermissionCodes: [],
        displayOrder: 1,
        active: true,
      },
    ],
    widgets: [
      {
        ownerId: 'DEFAULT',
        widgetKey: 'CONTENT:NOTICE',
        title: '通知',
        displayOrder: 10,
        visible: true,
      },
      {
        ownerId: 'user-1',
        widgetKey: 'CONTENT:NOTICE',
        title: '我的通知',
        displayOrder: 1,
        visible: true,
      },
    ],
  };
}

describe('TypeOrmPortalRepository', () => {
  let moduleRef: TestingModule;
  let repository: PortalRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: portalEntities,
          migrations: [
            PortalPermissionPrerequisites1784199999999,
            PortalReadModel1784200000000,
            PortalContentOperations1784300000000,
          ],
          migrationsRun: true,
          synchronize: false,
        }),
        TypeOrmModule.forFeature(portalEntities),
      ],
      providers: [{ provide: PORTAL_REPOSITORY, useClass: TypeOrmPortalRepository }],
    }).compile();
    repository = moduleRef.get(PORTAL_REPOSITORY);
    await repository.seed(seedData());
    await repository.seed(seedData());
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  it('seeds idempotently and excludes scheduled content in SQL', async () => {
    const result = await repository.findVisibleContents({
      at: now,
      audience: { userId: 'user-1', roleCodes: [], departmentIds: [] },
      category: 'NOTICE',
      offset: 0,
      limit: 10,
    });
    expect(result.total).toBe(1);
    expect(result.items.map((item) => item.content.id)).toEqual(['published']);
    expect((result.items[0]?.content as { body?: string }).body).toBeUndefined();
    await expect(repository.findContent('published')).resolves.toMatchObject({ body: '正文' });
  });

  it('keeps a single immutable first-read receipt', async () => {
    const first = await repository.saveReadReceipt('published', 'user-1', now);
    const second = await repository.saveReadReceipt(
      'published',
      'user-1',
      new Date('2026-07-13T09:00:00.000Z'),
    );
    expect(second.readAt.toISOString()).toBe(first.readAt.toISOString());
    await expect(repository.findReceipts(['published'], 'user-1')).resolves.toHaveLength(1);
    const read = await repository.findVisibleContents({
      at: now,
      audience: { userId: 'user-1', roleCodes: [], departmentIds: [] },
      requiresReceipt: true,
      readingStatus: 'READ',
    });
    const unread = await repository.findVisibleContents({
      at: now,
      audience: { userId: 'user-1', roleCodes: [], departmentIds: [] },
      requiresReceipt: true,
      readingStatus: 'UNREAD',
    });
    expect(read.items.map((item) => item.content.id)).toEqual(['published']);
    expect(unread.total).toBe(0);
  });

  it('returns default and personal widget configurations for application merging', async () => {
    const widgets = await repository.listWidgets('user-1');
    expect(widgets.map((widget) => widget.ownerId).sort()).toEqual(['DEFAULT', 'user-1']);
    await expect(
      repository.listEvents(now, new Date('2026-08-01T08:00:00.000Z')),
    ).resolves.toHaveLength(1);
    await expect(repository.listLinks()).resolves.toHaveLength(1);

    const refreshed = seedData();
    refreshed.events[0] = {
      ...refreshed.events[0]!,
      startAt: new Date('2026-08-14T08:00:00.000Z'),
      endAt: new Date('2026-08-14T09:00:00.000Z'),
    };
    await repository.seed(refreshed);
    const updated = await repository.listEvents(
      new Date('2026-08-01T00:00:00.000Z'),
      new Date('2026-08-31T23:59:59.999Z'),
    );
    expect(updated[0]?.startAt.toISOString()).toBe('2026-08-14T08:00:00.000Z');
  });
});
