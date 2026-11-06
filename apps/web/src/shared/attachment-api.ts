import type { DocumentAttachment } from '@oa/contracts';
import { apiRequest, apiRequestBlob } from './api';

/** 上传单据附件并返回服务端引用（id + 文件名）。 */
export function uploadDocumentAttachment(
  file: File,
  path = '/attachments',
): Promise<DocumentAttachment> {
  const body = new FormData();
  body.set('file', file, file.name);
  return apiRequest<DocumentAttachment>(path, { method: 'POST', body });
}

export function downloadDocumentAttachment(id: string): Promise<Blob> {
  return apiRequestBlob(`/attachments/${id}/download`);
}
