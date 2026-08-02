import type { PortalContentDetail, PortalContentSummary, SessionUser } from '@oa/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setToken } from '../../shared/api';
import { useSessionStore } from '../../shared/session';
import { loadPortalContent, loadPortalReading, markPortalContentRead } from './api/portal-api';
import { usePortalContentReader } from './usePortalContentReader';

vi.mock('./api/portal-api', () => ({
  loadPortalContent: vi.fn(),
  loadPortalHome: vi.fn(),
  loadPortalReading: vi.fn(),
  markPortalContentRead: vi.fn(),
}));

const user: SessionUser = {
  id: 'user-1',
  username: 'office',
  displayName: '办公室审核人',
  departmentId: 'dept-office',
  departmentName: '办公室',
  roleCodes: ['OFFICE_REVIEWER'],
  permissionCodes: ['CONTENT_VIEW'],
  memberships: [],
  dataScopes: [],
};

describe('portal content reader', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    setToken('account-token');
    setActivePinia(createPinia());
    useSessionStore().user = user;
    vi.clearAllMocks();
    vi.mocked(loadPortalReading).mockImplementation((status, page = 1, pageSize = 20) =>
      Promise.resolve({ status, page, pageSize, total: 0, items: [] }),
    );
    vi.mocked(markPortalContentRead).mockResolvedValue({
      contentId: 'content-b',
      readAt: '2026-07-13T09:00:00.000Z',
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('keeps a slow previous response from replacing or marking the current content', async () => {
    const contentA = deferred<PortalContentDetail>();
    const contentB = deferred<PortalContentDetail>();
    vi.mocked(loadPortalContent).mockImplementation((id) =>
      id === 'content-a' ? contentA.promise : contentB.promise,
    );
    const reader = usePortalContentReader();

    const openA = reader.openContent(summary('content-a'));
    const openB = reader.openContent(summary('content-b'));
    contentA.resolve(detail('content-a'));
    await openA;
    expect(markPortalContentRead).not.toHaveBeenCalledWith('content-a');

    contentB.resolve(detail('content-b'));
    await openB;
    expect(reader.content.value?.id).toBe('content-b');
    expect(markPortalContentRead).toHaveBeenCalledTimes(1);
    expect(markPortalContentRead).toHaveBeenCalledWith('content-b');
  });

  it('does not create a read receipt after the drawer is closed', async () => {
    const pending = deferred<PortalContentDetail>();
    vi.mocked(loadPortalContent).mockReturnValue(pending.promise);
    const reader = usePortalContentReader();

    const opening = reader.openContent(summary('content-a'));
    reader.setDrawerOpen(false);
    pending.resolve(detail('content-a'));
    await opening;

    expect(reader.drawerOpen.value).toBe(false);
    expect(markPortalContentRead).not.toHaveBeenCalled();
  });
});

function summary(id: string): PortalContentSummary {
  return {
    id,
    category: 'NOTICE',
    title: id,
    summary: '摘要',
    publisherName: '办公室',
    publisherDepartmentName: '办公室',
    publishedAt: '2026-07-13T08:00:00.000Z',
    pinned: false,
    requiresReceipt: true,
    read: false,
    coverImageUrl: null,
  };
}

function detail(id: string): PortalContentDetail {
  return { ...summary(id), body: '<p>正文</p>', attachments: [], readAt: null };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}
