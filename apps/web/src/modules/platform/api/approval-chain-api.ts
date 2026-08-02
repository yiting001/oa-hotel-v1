import { apiRequest } from '../../../shared/api';

export interface ApprovalChainSummary {
  code: string;
  documentType: string;
  name: string;
  steps: string[];
  stepLabels: string[];
  version: number;
  active: boolean;
}

export const approvalChainApi = {
  list(): Promise<ApprovalChainSummary[]> {
    return apiRequest<ApprovalChainSummary[]>('/workflow/approval-chains');
  },
  update(documentType: string, steps: string[]): Promise<ApprovalChainSummary> {
    return apiRequest<ApprovalChainSummary>(
      `/workflow/approval-chains/${encodeURIComponent(documentType)}`,
      { method: 'PUT', body: { steps } },
    );
  },
};
