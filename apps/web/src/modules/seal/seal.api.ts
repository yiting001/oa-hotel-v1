import { apiRequest, requestId } from '../../shared/api';
import type {
  SealAsset,
  SealBorrowInput,
  SealBorrowRecord,
  SealCheckoutInput,
  SealDocumentEnvelope,
  SealExecuteInput,
  SealReturnInput,
  SealUseInput,
  SealUseRecord,
} from './seal.types';

export function listSealAssets(): Promise<SealAsset[]> {
  return apiRequest<SealAsset[]>('/seals/assets');
}

export function getSealBorrow(id: string): Promise<SealDocumentEnvelope<SealBorrowRecord>> {
  return apiRequest<SealDocumentEnvelope<SealBorrowRecord>>(`/seals/borrow-requests/${id}`);
}

export function saveSealBorrow(
  input: SealBorrowInput,
  id?: string,
): Promise<SealDocumentEnvelope<SealBorrowRecord>> {
  return apiRequest<SealDocumentEnvelope<SealBorrowRecord>>(
    id ? `/seals/borrow-requests/${id}` : '/seals/borrow-requests',
    { method: id ? 'PATCH' : 'POST', body: { ...input } },
  );
}

export function getSealUse(id: string): Promise<SealDocumentEnvelope<SealUseRecord>> {
  return apiRequest<SealDocumentEnvelope<SealUseRecord>>(`/seals/use-requests/${id}`);
}

export function saveSealUse(
  input: SealUseInput,
  id?: string,
): Promise<SealDocumentEnvelope<SealUseRecord>> {
  return apiRequest<SealDocumentEnvelope<SealUseRecord>>(
    id ? `/seals/use-requests/${id}` : '/seals/use-requests',
    { method: id ? 'PATCH' : 'POST', body: { ...input } },
  );
}

export function submitSealDocument(id: string): Promise<unknown> {
  return apiRequest(`/workflow/documents/${id}/submit`, {
    method: 'POST',
    body: { requestId: requestId() },
  });
}

export function checkoutSealBorrow(
  id: string,
  input: SealCheckoutInput,
): Promise<SealDocumentEnvelope<SealBorrowRecord>> {
  return apiRequest<SealDocumentEnvelope<SealBorrowRecord>>(
    `/seals/borrow-requests/${id}/checkout`,
    { method: 'POST', body: { ...input } },
  );
}

export function returnSealBorrow(
  id: string,
  input: SealReturnInput,
): Promise<SealDocumentEnvelope<SealBorrowRecord>> {
  return apiRequest<SealDocumentEnvelope<SealBorrowRecord>>(`/seals/borrow-requests/${id}/return`, {
    method: 'POST',
    body: { ...input },
  });
}

export function executeSealUse(
  id: string,
  input: SealExecuteInput,
): Promise<SealDocumentEnvelope<SealUseRecord>> {
  return apiRequest<SealDocumentEnvelope<SealUseRecord>>(`/seals/use-requests/${id}/execute`, {
    method: 'POST',
    body: { ...input },
  });
}
