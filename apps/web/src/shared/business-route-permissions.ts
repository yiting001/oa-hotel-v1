import {
  isDocumentType,
  requiredBusinessDocumentPermissions,
  type BusinessPermissionAction,
} from '@oa/contracts';

export function businessDocumentRoutePermissions(action: unknown, documentType: unknown): string[] {
  const value = Array.isArray(documentType) ? documentType[0] : documentType;
  return isBusinessPermissionAction(action) && isDocumentType(value)
    ? requiredBusinessDocumentPermissions(value, action)
    : [];
}

function isBusinessPermissionAction(value: unknown): value is BusinessPermissionAction {
  return value === 'CREATE' || value === 'VIEW';
}
