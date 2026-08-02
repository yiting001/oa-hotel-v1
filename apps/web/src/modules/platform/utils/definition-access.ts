export type DefinitionStatus = 'DRAFT' | 'PUBLISHED' | 'RETIRED' | undefined;

/** A definition is writable only when both authorization and version state allow it. */
export function isDefinitionReadOnly(status: DefinitionStatus, canManage: boolean): boolean {
  return !canManage || status !== 'DRAFT';
}
