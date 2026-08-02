import { describe, expect, it } from 'vitest';
import { businessDocumentRoutePermissions } from './business-route-permissions';

describe('business document route permissions', () => {
  it('derives the module qualifier for dynamic detail and print routes', () => {
    expect(businessDocumentRoutePermissions('VIEW', 'MATERIAL_PURCHASE')).toEqual([
      'DOCUMENT_VIEW',
      'SUPPLY_VIEW',
    ]);
  });

  it('returns no derived permission for invalid route metadata or document types', () => {
    expect(businessDocumentRoutePermissions('EDIT', 'CONTRACT_REQUEST')).toEqual([]);
    expect(businessDocumentRoutePermissions('VIEW', 'UNKNOWN')).toEqual([]);
  });
});
