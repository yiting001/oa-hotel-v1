import type {
  DirectoryUser,
  DocumentFollowState,
  PublishedProcessSummary,
  WorkbenchPage,
  WorkbenchSummary,
  WorkflowCopyCommandResult,
  WorkflowCopyDelivery,
} from '@oa/contracts';
import { apiRequest } from '../../../shared/api';
import type { WorkbenchItemsRequest } from '../domain/workbench';

export function loadWorkbenchSummary(): Promise<WorkbenchSummary> {
  return apiRequest<WorkbenchSummary>('/workbench/summary');
}

export function loadPublishedProcessSummaries(): Promise<PublishedProcessSummary[]> {
  return apiRequest<PublishedProcessSummary[]>('/processes/published-summaries');
}

export function loadWorkbenchItems(input: WorkbenchItemsRequest): Promise<WorkbenchPage> {
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== '') parameters.set(key, String(value));
  }
  return apiRequest<WorkbenchPage>(`/workbench/items?${parameters.toString()}`);
}

export function loadDocumentFollowState(documentId: string): Promise<DocumentFollowState> {
  return apiRequest<DocumentFollowState>(`/workbench/documents/${documentId}/follow`);
}

export function followDocument(documentId: string): Promise<DocumentFollowState> {
  return apiRequest<DocumentFollowState>(`/workbench/documents/${documentId}/follow`, {
    method: 'POST',
  });
}

export function unfollowDocument(documentId: string): Promise<DocumentFollowState> {
  return apiRequest<DocumentFollowState>(`/workbench/documents/${documentId}/follow`, {
    method: 'DELETE',
  });
}

export function copyWorkflowDocument(
  documentId: string,
  recipientIds: string[],
): Promise<WorkflowCopyCommandResult> {
  return apiRequest<WorkflowCopyCommandResult>(`/workflow/documents/${documentId}/copies`, {
    method: 'POST',
    body: { recipientIds },
  });
}

export function loadWorkflowCopyRecipients(documentId: string): Promise<DirectoryUser[]> {
  return apiRequest<DirectoryUser[]>(`/workflow/documents/${documentId}/copy-recipients`);
}

export function markWorkflowCopyRead(copyId: string): Promise<WorkflowCopyDelivery> {
  return apiRequest<WorkflowCopyDelivery>(`/workflow/copies/${copyId}/read`, { method: 'POST' });
}
