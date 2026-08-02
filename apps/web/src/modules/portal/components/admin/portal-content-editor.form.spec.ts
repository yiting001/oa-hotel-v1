import type { PortalAdminContentDetail, PortalAudienceType } from '@oa/contracts';
import { describe, expect, it } from 'vitest';
import { createPortalContentEditorForm } from './portal-content-editor.form';

describe('portal content editor form', () => {
  it.each<PortalAudienceType>(['DEPARTMENT', 'ROLE', 'USER'])(
    'retains %s audience selections while hydrating an existing revision',
    (audienceType) => {
      const form = createPortalContentEditorForm(content(audienceType));

      expect(form.audienceType).toBe(audienceType);
      expect(form.audienceIds).toEqual(['target-1', 'target-2']);
    },
  );
});

function content(audienceType: PortalAudienceType): PortalAdminContentDetail {
  return {
    id: 'content-1',
    category: 'EVENT',
    title: '宴会保障',
    summary: '摘要',
    body: '<p>正文</p>',
    publisherId: 'user-office',
    publisherName: '办公室管理员',
    publisherDepartmentId: 'dept-office',
    publisherDepartmentName: '办公室',
    audienceType,
    audienceIds: ['target-1', 'target-2'],
    pinned: false,
    requiresReceipt: true,
    coverImageUrl: null,
    attachments: [],
    status: 'DRAFT',
    currentRevision: 1,
    publishedAt: null,
    offlineAt: '2026-07-15T01:30:00.000Z',
    withdrawnAt: null,
    createdAt: '2026-07-13T01:00:00.000Z',
    updatedAt: '2026-07-13T01:00:00.000Z',
  };
}
