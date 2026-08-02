import type { WorkbenchItem, WorkbenchSummary, WorkflowCopyDelivery } from '@oa/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearToken, setToken } from '../../../shared/api';
import { loadWorkbenchSummary, markWorkflowCopyRead } from '../api/workbench-api';
import { usePersonalWorkbenchStore } from './workbench';

vi.mock('../api/workbench-api', () => ({
  loadWorkbenchItems: vi.fn(),
  loadWorkbenchSummary: vi.fn(),
  markWorkflowCopyRead: vi.fn(),
}));

describe('personal workbench account isolation', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage());
    setToken('account-a-token');
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('does not let an old account response win after reset and a new login', async () => {
    const accountA = deferred<WorkbenchSummary>();
    const accountB = deferred<WorkbenchSummary>();
    vi.mocked(loadWorkbenchSummary)
      .mockReturnValueOnce(accountA.promise)
      .mockReturnValueOnce(accountB.promise);
    const store = usePersonalWorkbenchStore();

    const oldRequest = store.refreshSummary();
    store.$reset();
    clearToken();
    setToken('account-b-token');
    const newRequest = store.refreshSummary();
    accountA.resolve(summary(8));
    accountB.resolve(summary(2));
    await Promise.all([oldRequest, newRequest]);

    expect(store.summary?.counts.PENDING).toBe(2);
    expect(store.summaryLoading).toBe(false);
  });

  it('keeps the newer summary request in control of data and loading state', async () => {
    const older = deferred<WorkbenchSummary>();
    const newer = deferred<WorkbenchSummary>();
    vi.mocked(loadWorkbenchSummary)
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    const store = usePersonalWorkbenchStore();

    const olderRequest = store.refreshSummary();
    const newerRequest = store.refreshSummary();
    older.resolve(summary(8));
    await olderRequest;
    expect(store.summary).toBeNull();
    expect(store.summaryLoading).toBe(true);

    newer.resolve(summary(2));
    await newerRequest;
    expect(store.summary?.counts.PENDING).toBe(2);
    expect(store.summaryLoading).toBe(false);
  });

  it('updates only the matching copied item after its independent read receipt is saved', async () => {
    const store = usePersonalWorkbenchStore();
    store.pages.COPIED = {
      box: 'COPIED',
      page: 1,
      pageSize: 20,
      total: 2,
      items: [copiedItem('copy-a'), copiedItem('copy-b')],
    };
    vi.mocked(markWorkflowCopyRead).mockResolvedValue(copyDelivery('copy-a'));

    await store.markCopyRead('copy-a');

    expect(store.pages.COPIED.items.map((item) => item.copyReadAt)).toEqual([
      '2026-07-13T09:30:00.000Z',
      null,
    ]);
  });
});

function summary(pending: number): WorkbenchSummary {
  return {
    generatedAt: '2026-07-13T08:00:00.000Z',
    counts: { PENDING: pending, COMPLETED: 0, MINE: 0, DRAFTS: 0, FOLLOWING: 0, COPIED: 0 },
  };
}

function copiedItem(copyId: string): WorkbenchItem {
  return {
    id: `copied:${copyId}`,
    box: 'COPIED',
    taskId: null,
    documentId: `document-${copyId}`,
    documentType: 'CONTRACT_REQUEST',
    module: 'CONTRACT',
    documentTitle: `抄送单据 ${copyId}`,
    documentStatus: 'IN_REVIEW',
    applicantId: 'user-applicant',
    applicantName: '业务申请人',
    departmentId: 'dept-business',
    departmentName: '业务部',
    processNodeId: null,
    processNodeName: null,
    currentStep: 0,
    assigneeRole: null,
    followedAt: null,
    copyId,
    copySenderId: 'user-manager',
    copySenderName: '部门总监',
    copyReadAt: null,
    revision: 1,
    createdAt: '2026-07-13T08:00:00.000Z',
    updatedAt: '2026-07-13T08:00:00.000Z',
  };
}

function copyDelivery(id: string): WorkflowCopyDelivery {
  return {
    id,
    documentId: `document-${id}`,
    senderId: 'user-manager',
    senderName: '部门总监',
    recipientId: 'user-applicant',
    recipientName: '业务申请人',
    readAt: '2026-07-13T09:30:00.000Z',
    createdAt: '2026-07-13T08:00:00.000Z',
  };
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
