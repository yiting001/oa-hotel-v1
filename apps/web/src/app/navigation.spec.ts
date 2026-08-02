import { DEFAULT_MENUS, buildMenuTree } from '@oa/contracts';
import { describe, expect, it } from 'vitest';
import {
  mobilePrimaryNavigation,
  navigationGroupsFromMenuTree,
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

  it('builds navigation from the served menu tree with permission filtering', () => {
    const grantedIds = new Set([
      'menu-business',
      'menu-contract',
      'menu-seal',
      'menu-office',
      'menu-workbench',
    ]);
    const tree = buildMenuTree(DEFAULT_MENUS.filter((menu) => grantedIds.has(menu.id)));
    const groups = navigationGroupsFromMenuTree(
      tree,
      ['DOCUMENT_VIEW', 'WORKFLOW_APPROVE', 'CONTRACT_VIEW'],
      0,
    );
    const ids = groups.flatMap((group) => group.items.map((item) => item.id));

    expect(ids).toContain('contract');
    expect(ids).toContain('workbench');
    // 授权了印章菜单，但用户缺少 SEAL_VIEW 功能权限，仍应过滤
    expect(ids).not.toContain('seal');
    // 未授权的菜单不出现
    expect(ids).not.toContain('supply');
  });

  it('selects the dedicated approval entry for the pending workbench tab', () => {
    const groups = visibleNavigationGroups(['WORKFLOW_APPROVE'], 0);

    expect(selectedNavigationPath(groups, '/workbench', 'pending')).toBe('/workbench?tab=pending');
    expect(selectedNavigationPath(groups, '/workbench', 'completed')).toBe('/workbench');
  });
});
