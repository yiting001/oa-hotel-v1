import { describe, expect, it } from 'vitest';
import {
  mobilePrimaryNavigation,
  selectedNavigationPath,
  visibleNavigationGroups,
} from './navigation';

describe('application navigation', () => {
  it('keeps approval visible for an approver without exposing create or platform entries', () => {
    const groups = visibleNavigationGroups(
      ['PORTAL_VIEW', 'CONTENT_VIEW', 'DOCUMENT_VIEW', 'WORKFLOW_APPROVE', 'CONTRACT_VIEW'],
      0,
    );
    const ids = groups.flatMap((group) => group.items.map((item) => item.id));

    expect(ids).toContain('approval');
    expect(ids).toContain('contract');
    expect(ids).not.toContain('start');
    expect(ids).not.toContain('forms');
  });

  it('shows all three business modules, designers and process starts to an administrator', () => {
    const permissions = [
      'PORTAL_VIEW',
      'CONTENT_VIEW',
      'CONTENT_MANAGE',
      'DOCUMENT_CREATE',
      'DOCUMENT_VIEW',
      'WORKFLOW_APPROVE',
      'CONTRACT_CREATE',
      'CONTRACT_VIEW',
      'SEAL_CREATE',
      'SEAL_VIEW',
      'SUPPLY_CREATE',
      'SUPPLY_VIEW',
      'IAM_VIEW',
      'PROCESS_DESIGN_VIEW',
      'FORM_DESIGN_VIEW',
    ];
    const groups = visibleNavigationGroups(permissions, 7);
    const ids = groups.flatMap((group) => group.items.map((item) => item.id));

    expect(ids).toEqual(
      expect.arrayContaining([
        'approval',
        'start',
        'contract',
        'seal',
        'supply',
        'processes',
        'forms',
      ]),
    );
    expect(mobilePrimaryNavigation(groups).map((item) => item.id)).toEqual([
      'portal',
      'approval',
      'start',
      'workbench',
    ]);
  });

  it('selects the dedicated approval entry for the pending workbench tab', () => {
    const groups = visibleNavigationGroups(['WORKFLOW_APPROVE'], 0);

    expect(selectedNavigationPath(groups, '/workbench', 'pending')).toBe('/workbench?tab=pending');
    expect(selectedNavigationPath(groups, '/workbench', 'completed')).toBe('/workbench');
  });
});
