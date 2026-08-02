import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api';
import { workflowNodeLabel } from './document';
import { useWorkflowStore } from './workflow';

vi.mock('./api', () => ({
  apiRequest: vi.fn(),
}));

describe('workflow commands', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('does not turn a successful approval into a failure by refreshing legacy read models', async () => {
    vi.mocked(apiRequest).mockResolvedValue({});
    const store = useWorkflowStore();

    await store.completeTask('task-1', 'approve', '同意办理', 'request-1');

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith('/workflow/tasks/task-1/approve', {
      method: 'POST',
      body: { requestId: 'request-1', comment: '同意办理' },
    });
  });

  it('reuses the caller-owned idempotency key when an unknown result is retried', async () => {
    vi.mocked(apiRequest).mockRejectedValueOnce(new Error('响应丢失')).mockResolvedValueOnce({});
    const store = useWorkflowStore();

    await expect(
      store.completeTask('task-1', 'approve', '同意办理', 'stable-request'),
    ).rejects.toThrow('响应丢失');
    await store.completeTask('task-1', 'approve', '同意办理', 'stable-request');

    expect(vi.mocked(apiRequest).mock.calls.map((call) => call[1])).toEqual([
      { method: 'POST', body: { requestId: 'stable-request', comment: '同意办理' } },
      { method: 'POST', body: { requestId: 'stable-request', comment: '同意办理' } },
    ]);
  });

  it('preserves the caller-owned batch request id after an unknown response', async () => {
    vi.mocked(apiRequest)
      .mockRejectedValueOnce(new Error('响应丢失'))
      .mockResolvedValueOnce({ succeeded: 2, failed: 0 });
    const store = useWorkflowStore();

    await expect(
      store.batchApprove(['task-1', 'task-2'], '批量同意', 'batch-stable'),
    ).rejects.toThrow('响应丢失');
    await store.batchApprove(['task-1', 'task-2'], '批量同意', 'batch-stable');

    expect(vi.mocked(apiRequest).mock.calls.map((call) => call[1])).toEqual([
      {
        method: 'POST',
        body: {
          requestId: 'batch-stable',
          taskIds: ['task-1', 'task-2'],
          comment: '批量同意',
        },
      },
      {
        method: 'POST',
        body: {
          requestId: 'batch-stable',
          taskIds: ['task-1', 'task-2'],
          comment: '批量同意',
        },
      },
    ]);
  });

  it('does not expose unknown workflow role codes as user-facing node names', () => {
    expect(workflowNodeLabel('FINANCE_REVIEWER')).toBe('财务审核');
    expect(workflowNodeLabel('LEGACY_UNKNOWN_ROLE')).toBe('审批办理');
    expect(workflowNodeLabel('财务复核')).toBe('财务复核');
  });
});
