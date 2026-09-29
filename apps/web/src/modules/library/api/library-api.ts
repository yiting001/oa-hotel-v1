import { apiRequest, apiRequestBlob } from '../../../shared/api';
import type { LibraryCategory, LibraryDocument, LibraryDocumentPage } from '../library.types';

export function listLibraryDocuments(input: {
  category?: LibraryCategory;
  keyword?: string;
  page: number;
  pageSize: number;
}): Promise<LibraryDocumentPage> {
  const parameters = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  if (input.category) parameters.set('category', input.category);
  if (input.keyword?.trim()) parameters.set('keyword', input.keyword.trim());
  return apiRequest<LibraryDocumentPage>(`/library/documents?${parameters.toString()}`);
}

export function uploadLibraryDocument(input: {
  title: string;
  category: LibraryCategory;
  description: string;
  file: File;
}): Promise<LibraryDocument> {
  const body = new FormData();
  body.set('title', input.title);
  body.set('category', input.category);
  body.set('description', input.description);
  body.set('file', input.file, input.file.name);
  return apiRequest<LibraryDocument>('/library/documents', { method: 'POST', body });
}

export function downloadLibraryDocument(id: string): Promise<Blob> {
  return apiRequestBlob(`/library/documents/${id}/download`);
}

export function previewLibraryDocument(id: string): Promise<Blob> {
  return apiRequestBlob(`/library/documents/${id}/preview`);
}

export function removeLibraryDocument(id: string): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(`/library/documents/${id}`, { method: 'DELETE' });
}
