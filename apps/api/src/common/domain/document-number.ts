export function createDocumentNumber(documentType: string, id: string, now = new Date()): string {
  const date = now.toISOString().slice(0, 10).replaceAll('-', '');
  return `${documentType}-${date}-${id.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}
