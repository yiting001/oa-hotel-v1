import type { SessionUser } from '@oa/contracts';
import { describe, expect, it } from 'vitest';
import type { PortalContent } from './portal.types';
import { PortalVisibilityPolicy } from './portal-visibility.policy';

const now = new Date('2026-07-13T08:00:00.000Z');
const user: SessionUser = {
  id: 'user-1',
  username: 'reader',
  displayName: '阅读人',
  departmentId: 'dept-primary',
  departmentName: '主部门',
  roleCodes: ['APPLICANT'],
  permissionCodes: [],
  memberships: [
    {
      id: 'membership-1',
      departmentId: 'dept-secondary',
      departmentName: '兼任部门',
      positionId: null,
      positionName: null,
      isPrimary: false,
      isDepartmentHead: false,
      active: true,
    },
    {
      id: 'membership-inactive',
      departmentId: 'dept-inactive',
      departmentName: '已停用任职',
      positionId: null,
      positionName: null,
      isPrimary: false,
      isDepartmentHead: false,
      active: false,
    },
  ],
  dataScopes: [],
};

function content(overrides: Partial<PortalContent> = {}): PortalContent {
  return {
    id: 'content-1',
    category: 'NOTICE',
    title: '通知',
    summary: '摘要',
    body: '正文',
    publisherId: 'publisher-1',
    publisherName: '发布人',
    publisherDepartmentId: 'dept-office',
    publisherDepartmentName: '办公室',
    audienceType: 'ALL',
    audienceIds: [],
    pinned: false,
    requiresReceipt: false,
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

describe('PortalVisibilityPolicy', () => {
  const policy = new PortalVisibilityPolicy();

  it('rejects scheduled, offline, and withdrawn content', () => {
    expect(
      policy.isVisible(content({ publishedAt: new Date('2026-07-14T08:00:00Z') }), user, now),
    ).toBe(false);
    expect(
      policy.isVisible(content({ offlineAt: new Date('2026-07-13T08:00:00Z') }), user, now),
    ).toBe(false);
    expect(policy.isVisible(content({ status: 'WITHDRAWN' }), user, now)).toBe(false);
  });

  it('matches all active memberships rather than only the primary department', () => {
    expect(
      policy.isVisible(
        content({ audienceType: 'DEPARTMENT', audienceIds: ['dept-secondary'] }),
        user,
        now,
      ),
    ).toBe(true);
    expect(
      policy.isVisible(
        content({ audienceType: 'DEPARTMENT', audienceIds: ['dept-other'] }),
        user,
        now,
      ),
    ).toBe(false);
    expect(
      policy.isVisible(
        content({ audienceType: 'DEPARTMENT', audienceIds: ['dept-inactive'] }),
        user,
        now,
      ),
    ).toBe(false);
  });

  it('matches role and explicit-user audiences independently', () => {
    expect(
      policy.isVisible(content({ audienceType: 'ROLE', audienceIds: ['APPLICANT'] }), user, now),
    ).toBe(true);
    expect(
      policy.isVisible(content({ audienceType: 'USER', audienceIds: ['user-1'] }), user, now),
    ).toBe(true);
    expect(
      policy.isVisible(content({ audienceType: 'USER', audienceIds: ['user-2'] }), user, now),
    ).toBe(false);
  });
});
