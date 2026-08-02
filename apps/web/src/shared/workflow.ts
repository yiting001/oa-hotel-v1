import type {
  ApprovalTaskSummary,
  BatchApprovalResult,
  DocumentSummary,
  WorkflowOverview,
} from '@oa/contracts';
import { defineStore } from 'pinia';
import { apiRequest, getAuthGeneration } from './api';

export const useWorkflowStore = defineStore('workflow', {
  state: () => ({
    tasks: [] as ApprovalTaskSummary[],
    completedTasks: [] as ApprovalTaskSummary[],
    documents: [] as DocumentSummary[],
    loading: false,
    loaded: false,
    refreshSequence: 0,
  }),
  getters: {
    draftCount: (state) => state.documents.filter((item) => item.status === 'DRAFT').length,
    reviewingCount: (state) => state.documents.filter((item) => item.status === 'IN_REVIEW').length,
    approvedCount: (state) => state.documents.filter((item) => item.status === 'APPROVED').length,
  },
  actions: {
    async refresh(): Promise<void> {
      const generation = getAuthGeneration();
      const sequence = ++this.refreshSequence;
      this.loading = true;
      try {
        const [tasks, completedTasks, documents] = await Promise.all([
          apiRequest<ApprovalTaskSummary[]>('/workflow/tasks'),
          apiRequest<ApprovalTaskSummary[]>('/workflow/completed-tasks'),
          apiRequest<DocumentSummary[]>('/workflow/my-documents'),
        ]);
        if (generation === getAuthGeneration() && sequence === this.refreshSequence) {
          this.tasks = tasks;
          this.completedTasks = completedTasks;
          this.documents = documents;
          this.loaded = true;
        }
      } finally {
        if (generation === getAuthGeneration() && sequence === this.refreshSequence) {
          this.loading = false;
        }
      }
    },
    async loadOverview(documentId: string): Promise<WorkflowOverview> {
      return apiRequest<WorkflowOverview>(`/workflow/documents/${documentId}/overview`);
    },
    async completeTask(
      taskId: string,
      action: 'approve' | 'return',
      comment: string,
      commandRequestId: string,
    ): Promise<void> {
      await apiRequest(`/workflow/tasks/${taskId}/${action}`, {
        method: 'POST',
        body: { requestId: commandRequestId, comment },
      });
    },
    async batchApprove(
      taskIds: string[],
      comment: string,
      commandRequestId: string,
    ): Promise<BatchApprovalResult> {
      return apiRequest<BatchApprovalResult>('/workflow/tasks/batch-approve', {
        method: 'POST',
        body: { requestId: commandRequestId, taskIds, comment },
      });
    },
  },
});
