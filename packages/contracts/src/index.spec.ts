import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_TYPE_MODULES,
  isDocumentType,
  requiredBusinessDocumentPermissions,
  requiredBusinessModulePermissions,
  type DocumentStatus,
  type PortalContentDetail,
  type PortalContentPage,
  type PortalHomeResponse,
  type WorkbenchPage,
  WORKBENCH_BOXES,
} from './index.js';

describe('shared contracts', () => {
  it('exposes supported document states', () => {
    const state: DocumentStatus = 'DRAFT';
    expect(state).toBe('DRAFT');
  });

  it('binds generic document capabilities to one explicit business module', () => {
    expect(requiredBusinessModulePermissions('CONTRACT', 'CREATE')).toEqual([
      'DOCUMENT_CREATE',
      'CONTRACT_CREATE',
    ]);
    expect(requiredBusinessDocumentPermissions('SEAL_USE', 'VIEW')).toEqual([
      'DOCUMENT_VIEW',
      'SEAL_VIEW',
    ]);
    expect(DOCUMENT_TYPE_MODULES.MATERIAL_REQUISITION).toBe('SUPPLY');
  });

  it('rejects unknown document types before deriving dynamic route permissions', () => {
    expect(isDocumentType('CONTRACT_PAYMENT')).toBe(true);
    expect(isDocumentType('UNKNOWN_DOCUMENT')).toBe(false);
  });

  it('keeps portal home summaries separate from full content bodies', () => {
    const home: PortalHomeResponse = {
      generatedAt: '2026-07-13T08:00:00.000Z',
      sections: [],
      calendarEvents: [],
      quickLinks: [],
      widgets: [],
    };
    const detail: PortalContentDetail = {
      id: 'content-1',
      category: 'NOTICE',
      title: '通知',
      summary: '摘要',
      body: '<p>正文</p>',
      attachments: [],
      publisherName: '办公室',
      publisherDepartmentName: '办公室',
      publishedAt: '2026-07-13T08:00:00.000Z',
      pinned: false,
      requiresReceipt: true,
      read: false,
      readAt: null,
      coverImageUrl: null,
    };

    expect(home.sections).toEqual([]);
    expect(detail.body).toContain('正文');
  });

  it('exposes portal category pagination without full content bodies', () => {
    const page: PortalContentPage = {
      category: 'NOTICE',
      page: 1,
      pageSize: 20,
      total: 0,
      items: [],
    };
    expect(page.category).toBe('NOTICE');
  });

  it('defines stable workbench boxes and paged result metadata', () => {
    const page: WorkbenchPage = {
      box: 'PENDING',
      page: 1,
      pageSize: 20,
      total: 0,
      items: [],
    };

    expect(WORKBENCH_BOXES).toEqual([
      'PENDING',
      'COMPLETED',
      'MINE',
      'DRAFTS',
      'FOLLOWING',
      'COPIED',
    ]);
    expect(page.pageSize).toBe(20);
  });
});
