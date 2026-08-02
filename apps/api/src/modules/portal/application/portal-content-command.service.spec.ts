import type { SessionUser } from '@oa/contracts';
import { describe, expect, it } from 'vitest';
import type {
  PortalContentAdminPageResult,
  PortalContentAdminRepository,
  PortalContentMutationRecord,
} from '../domain/portal-content-admin.repository';
import type { PortalContent, PortalContentAudit } from '../domain/portal.types';
import { PortalContentCommandService } from './portal-content-command.service';

const actor: SessionUser = {
  id: 'user-office',
  username: 'office',
  displayName: '办公室管理员',
  departmentId: 'dept-office',
  departmentName: '办公室',
  roleCodes: ['OFFICE_REVIEWER'],
  permissionCodes: ['CONTENT_MANAGE'],
  memberships: [],
  dataScopes: [],
};
const firstAt = new Date('2026-07-13T01:00:00.000Z');

class MemoryPortalContentAdminRepository implements PortalContentAdminRepository {
  contents = new Map<string, PortalContent>();
  records: PortalContentMutationRecord[] = [];

  list(): Promise<PortalContentAdminPageResult> {
    const items = [...this.contents.values()].map(cloneContent);
    return Promise.resolve({ total: items.length, items });
  }

  findById(id: string): Promise<PortalContent | null> {
    const content = this.contents.get(id);
    return Promise.resolve(content ? cloneContent(content) : null);
  }

  commit(record: PortalContentMutationRecord): Promise<boolean> {
    const current = this.contents.get(record.content.id);
    if (
      record.expectedRevision === null
        ? current
        : current?.currentRevision !== record.expectedRevision
    ) {
      return Promise.resolve(false);
    }
    this.contents.set(record.content.id, cloneContent(record.content));
    this.records.push(structuredClone(record));
    return Promise.resolve(true);
  }

  listAudit(contentId: string): Promise<PortalContentAudit[]> {
    return Promise.resolve(
      this.records
        .filter((record) => record.content.id === contentId)
        .map((record) => structuredClone(record.audit))
        .reverse(),
    );
  }

  publishDueScheduled(): Promise<number> {
    return Promise.resolve(0);
  }
}

describe('PortalContentCommandService', () => {
  it('keeps prior immutable snapshots when a published article is revised', async () => {
    const repository = new MemoryPortalContentAdminRepository();
    const service = new PortalContentCommandService(repository);
    const created = await service.create(
      {
        category: 'EVENT',
        title: '宴会接待安排',
        summary: '初版摘要',
        body: '<p>初版正文</p>',
        audienceType: 'DEPARTMENT',
        audienceIds: ['dept-banquet'],
        requiresReceipt: true,
      },
      actor,
      firstAt,
    );
    await service.publish(created.id, {}, actor, new Date('2026-07-13T02:00:00.000Z'));
    const revised = await service.update(
      created.id,
      { title: '宴会接待安排（修订）', body: '<p>修订正文</p>' },
      actor,
      new Date('2026-07-13T03:00:00.000Z'),
    );

    expect(revised).toMatchObject({ status: 'PUBLISHED', currentRevision: 3 });
    expect(repository.records.map((record) => record.audit.action)).toEqual([
      'CREATED',
      'PUBLISHED',
      'UPDATED',
    ]);
    expect(repository.records[1]?.revision.snapshot).toMatchObject({
      title: '宴会接待安排',
      body: '<p>初版正文</p>',
      status: 'PUBLISHED',
    });
    expect(repository.records[2]?.revision.snapshot).toMatchObject({
      title: '宴会接待安排（修订）',
      body: '<p>修订正文</p>',
      status: 'PUBLISHED',
    });
  });

  it('schedules future publication and rejects an empty targeted audience', async () => {
    const repository = new MemoryPortalContentAdminRepository();
    const service = new PortalContentCommandService(repository);
    const created = await service.create(
      {
        category: 'NOTICE',
        title: '定时通知',
        summary: '摘要',
        body: '<p>正文</p>',
        audienceType: 'ALL',
      },
      actor,
      firstAt,
    );
    const scheduled = await service.publish(
      created.id,
      { publishAt: '2026-07-15T01:30:00.000Z' },
      actor,
      firstAt,
    );

    expect(scheduled).toMatchObject({
      status: 'SCHEDULED',
      publishedAt: '2026-07-15T01:30:00.000Z',
    });
    await expect(
      service.update(created.id, { audienceType: 'ROLE', audienceIds: [] }, actor, firstAt),
    ).rejects.toMatchObject({ code: 'PORTAL_CONTENT_AUDIENCE_INVALID' });
  });

  it('strips executable HTML and unsafe link schemes before storing a revision', async () => {
    const repository = new MemoryPortalContentAdminRepository();
    const service = new PortalContentCommandService(repository);
    const created = await service.create(
      {
        category: 'NOTICE',
        title: '安全通知',
        summary: '摘要',
        body: '<p onclick="alert(1)">安全正文<script>alert(1)</script><a href="javascript:alert(2)">链接</a></p>',
        audienceType: 'ALL',
      },
      actor,
      firstAt,
    );

    expect(created.body).toContain('安全正文');
    expect(created.body).not.toMatch(/script|onclick|javascript:/i);
    expect(repository.records[0]?.revision.snapshot.body).toBe(created.body);
  });
});

function cloneContent(content: PortalContent): PortalContent {
  return {
    ...content,
    audienceIds: [...content.audienceIds],
    attachments: [...content.attachments],
    publishedAt: content.publishedAt ? new Date(content.publishedAt) : null,
    offlineAt: content.offlineAt ? new Date(content.offlineAt) : null,
    withdrawnAt: content.withdrawnAt ? new Date(content.withdrawnAt) : null,
    createdAt: new Date(content.createdAt),
    updatedAt: new Date(content.updatedAt),
  };
}
