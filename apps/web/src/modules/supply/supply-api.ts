import { apiRequest, requestId } from '../../shared/api';
import type {
  IssuePayload,
  MaterialItem,
  MaterialRequisitionPayload,
  PurchaseEnvelope,
  PurchaseRequestPayload,
  RequisitionEnvelope,
} from './types';

const endpoint = {
  items: '/supplies/items',
  purchaseCollection: '/supplies/purchase-requests',
  purchase: (id: string) => `/supplies/purchase-requests/${id}`,
  requisitionCollection: '/supplies/requisitions',
  requisition: (id: string) => `/supplies/requisitions/${id}`,
  issue: (id: string) => `/supplies/requisitions/${id}/issue`,
  submit: (id: string) => `/workflow/documents/${id}/submit`,
} as const;

export const supplyApi = {
  listItems(): Promise<MaterialItem[]> {
    return apiRequest<MaterialItem[]>(endpoint.items);
  },

  getPurchase(id: string): Promise<PurchaseEnvelope> {
    return apiRequest<PurchaseEnvelope>(endpoint.purchase(id));
  },

  savePurchase(id: string | null, payload: PurchaseRequestPayload): Promise<PurchaseEnvelope> {
    return apiRequest<PurchaseEnvelope>(id ? endpoint.purchase(id) : endpoint.purchaseCollection, {
      method: id ? 'PATCH' : 'POST',
      body: payload,
    });
  },

  getRequisition(id: string): Promise<RequisitionEnvelope> {
    return apiRequest<RequisitionEnvelope>(endpoint.requisition(id));
  },

  saveRequisition(
    id: string | null,
    payload: MaterialRequisitionPayload,
  ): Promise<RequisitionEnvelope> {
    return apiRequest<RequisitionEnvelope>(
      id ? endpoint.requisition(id) : endpoint.requisitionCollection,
      { method: id ? 'PATCH' : 'POST', body: payload },
    );
  },

  issue(id: string, payload: IssuePayload): Promise<RequisitionEnvelope> {
    return apiRequest<RequisitionEnvelope>(endpoint.issue(id), { method: 'POST', body: payload });
  },

  submit(id: string): Promise<unknown> {
    return apiRequest<unknown>(endpoint.submit(id), {
      method: 'POST',
      body: { requestId: requestId() },
    });
  },
};
