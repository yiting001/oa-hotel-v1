import type { DocumentType } from '@oa/contracts';

export function businessDocumentPrintPath(documentType: DocumentType, id: string): string {
  return `/documents/${documentType}/${id}/print`;
}
