import type {
  PortalContentSummary,
  PortalHomeResponse,
  PortalReadingResponse,
  PortalReadingStatus,
} from '@oa/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearToken, setToken } from '../../../shared/api';
import { loadPortalHome, loadPortalReading, markPortalContentRead } from '../api/portal-api';
import { usePortalStore } from './portal';

vi.mock('../api/portal-api', () => ({
  loadPortalContent: vi.fn(),
  loadPortalHome: vi.fn(),
  loadPortalReading: vi.fn(),
  markPortalContentRead: vi.fn(),
}));

const content: PortalContentSummary = {
  id: 'content-1',
  category: 'NOTICE',
  title: '测试通知',
  summary: '摘要',
  publisherName: '办公室',
  publisherDepartmentName: '办公室',
  publishedAt: '2026-07-13T08:00:00.000Z',
  pinned: false,
  requiresReceipt: true,
  read: false,
  coverImageUrl: null,
};

describe('portal reading state', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    setToken('account-a-token');
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.mocked(loadPortalReading).mockImplementation((status, page = 1, pageSize = 20) =>
      Promise.resolve(readingResponse(status, [], page, pageSize)),
    );
    vi.mocked(markPortalContentRead).mockResolvedValue({
      contentId: content.id,
      readAt: '2026-07-13T09:00:00.000Z',
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('tracks concurrent loading independently by reading status', async () => {
    const unread = deferred<PortalReadingResponse>();
    const read = deferred<PortalReadingResponse>();
    vi.mocked(loadPortalReading).mockImplementation((status) =>
      status === 'UNREAD' ? unread.promise : read.promise,
    );
    const store = usePortalStore();

    const unreadRequest = store.refreshReading('UNREAD');
    const readRequest = store.refreshReading('READ');
    expect(store.readingLoadingByStatus).toEqual({ ALL: false, UNREAD: true, READ: true });
    expect(store.readingLoading).toBe(true);

    unread.resolve(readingResponse('UNREAD', [content]));
    await unreadRequest;
    expect(store.readingLoadingByStatus.READ).toBe(true);
    expect(store.readingLoading).toBe(true);

    read.resolve(readingResponse('READ', []));
    await readRequest;
    expect(store.readingLoading).toBe(false);
  });

  it('does not let a stale unread response undo a read receipt', async () => {
    const unread = deferred<PortalReadingResponse>();
    let firstUnread = true;
    vi.mocked(loadPortalReading).mockImplementation((status, page = 1, pageSize = 20) => {
      if (status === 'UNREAD' && firstUnread) {
        firstUnread = false;
        return unread.promise;
      }
      return Promise.resolve(
        readingResponse(
          status,
          status === 'READ' ? [{ ...content, read: true }] : [],
          page,
          pageSize,
        ),
      );
    });
    const store = usePortalStore();
    store.readingPages.UNREAD = readingResponse('UNREAD', [content]);

    const unreadRequest = store.refreshReading('UNREAD');
    await store.markRead(content);
    unread.resolve(readingResponse('UNREAD', [content]));
    await unreadRequest;

    expect(store.readings.UNREAD).toEqual([]);
    expect(store.readings.READ).toEqual([{ ...content, read: true }]);
  });

  it('does not let a stale home response undo a read receipt', async () => {
    const home = portalHome(content);
    const staleHome = deferred<PortalHomeResponse>();
    vi.mocked(loadPortalHome).mockReturnValue(staleHome.promise);
    vi.mocked(markPortalContentRead).mockResolvedValue({
      contentId: content.id,
      readAt: '2026-07-13T09:00:00.000Z',
    });
    const store = usePortalStore();
    store.home = home;

    const homeRequest = store.refreshHome();
    await store.markRead(content);
    staleHome.resolve(home);
    await homeRequest;

    expect(store.home?.sections[0]?.unreadCount).toBe(0);
    expect(store.home?.sections[0]?.items[0]?.read).toBe(true);
  });

  it('does not commit an old account response after a new account signs in', async () => {
    const unread = deferred<PortalReadingResponse>();
    vi.mocked(loadPortalReading).mockReturnValue(unread.promise);
    const store = usePortalStore();

    const oldRequest = store.refreshReading('UNREAD');
    clearToken();
    setToken('account-b-token');
    unread.resolve(readingResponse('UNREAD', [content]));
    await oldRequest;

    expect(store.readings.UNREAD).toEqual([]);
  });

  it('keeps ordinary news out of the receipt-based read box', async () => {
    const ordinary = { ...content, id: 'news-1', requiresReceipt: false };
    vi.mocked(markPortalContentRead).mockResolvedValue({
      contentId: ordinary.id,
      readAt: '2026-07-13T09:00:00.000Z',
    });
    const store = usePortalStore();
    store.home = portalHome(ordinary);

    await store.markRead(ordinary);

    expect(store.home.sections[0]?.items[0]?.read).toBe(true);
    expect(store.readings.READ).toEqual([]);
  });

  it('refetches the current receipt pages instead of splicing paged results', async () => {
    const currentItems = Array.from({ length: 20 }, (_, index) => ({
      ...content,
      id: `content-${index + 1}`,
    }));
    const replacement = { ...content, id: 'content-21' };
    const store = usePortalStore();
    store.readingPages.UNREAD = readingResponse('UNREAD', currentItems, 1, 20, 41);
    vi.mocked(loadPortalReading).mockImplementation((status, page = 1, pageSize = 20) =>
      Promise.resolve(
        status === 'UNREAD'
          ? readingResponse('UNREAD', [...currentItems.slice(1), replacement], page, pageSize, 40)
          : readingResponse('READ', [{ ...currentItems[0], read: true }], page, pageSize, 1),
      ),
    );

    await store.markRead(content);

    expect(store.readingPages.UNREAD.items).toHaveLength(20);
    expect(store.readingPages.UNREAD.items.at(-1)?.id).toBe('content-21');
    expect(store.readingPages.UNREAD.total).toBe(40);
  });

  it('moves back to the new last page when a read receipt empties the old last page', async () => {
    const store = usePortalStore();
    store.readingPages.UNREAD = readingResponse('UNREAD', [content], 3, 20, 41);
    vi.mocked(loadPortalReading).mockImplementation((status, page = 1, pageSize = 20) =>
      Promise.resolve(readingResponse(status, [], page, pageSize, status === 'UNREAD' ? 40 : 1)),
    );

    await store.markRead(content);

    expect(store.readingPages.UNREAD.page).toBe(2);
    expect(loadPortalReading).toHaveBeenCalledWith('UNREAD', 2, 20);
  });

  it('decrements the category badge when reading content outside the home preview', async () => {
    const listedContent = { ...content, id: 'content-7' };
    const store = usePortalStore();
    store.home = portalHome({ ...content, id: 'content-1' });
    store.home.sections[0]!.total = 7;
    store.home.sections[0]!.unreadCount = 2;

    await store.markRead(listedContent);

    expect(store.home.sections[0]?.unreadCount).toBe(1);
    expect(store.home.sections[0]?.items[0]?.read).toBe(false);
  });
});

function readingResponse(
  status: PortalReadingStatus,
  items: PortalContentSummary[],
  page = 1,
  pageSize = 20,
  total = items.length,
): PortalReadingResponse {
  return { status, page, pageSize, total, items };
}

function portalHome(item: PortalContentSummary): PortalHomeResponse {
  return {
    generatedAt: '2026-07-13T08:00:00.000Z',
    sections: [
      {
        key: 'NOTICE',
        title: '通知公告',
        displayOrder: 1,
        total: 1,
        unreadCount: 1,
        items: [item],
      },
    ],
    calendarEvents: [],
    quickLinks: [],
    widgets: [],
  };
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
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
