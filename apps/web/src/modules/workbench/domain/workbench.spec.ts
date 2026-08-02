import { describe, expect, it } from 'vitest';
import { availableProcessStarts } from '../../../shared/process-start';
import { createWorkbenchItemsRequest } from './workbench';
import { resolveWorkbenchTab } from './workbench-tabs';

describe('portal domain helpers', () => {
  it('only exposes quick starts whose generic and module permissions are both granted', () => {
    expect(
      availableProcessStarts([
        'DOCUMENT_CREATE',
        'CONTRACT_CREATE',
        'SEAL_CREATE',
        'SUPPLY_VIEW',
      ]).map((item) => item.documentType),
    ).toEqual([
      'CONTRACT_REQUEST',
      'CONTRACT_APPROVAL',
      'CONTRACT_PAYMENT',
      'SEAL_BORROW',
      'SEAL_USE',
    ]);
  });

  it('maps visible filters to the server-side workbench query contract', () => {
    expect(
      createWorkbenchItemsRequest('MINE', 2, 20, {
        keyword: '  采购  ',
        documentType: 'CONTRACT_REQUEST',
        applicantId: 'user-1',
        departmentId: 'dept-1',
        status: 'IN_REVIEW',
        dateRange: ['2026-07-01', '2026-07-31'],
      }),
    ).toEqual({
      box: 'MINE',
      page: 2,
      pageSize: 20,
      keyword: '采购',
      documentType: 'CONTRACT_REQUEST',
      departmentId: 'dept-1',
      status: 'IN_REVIEW',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
    });
  });

  it('omits unselected optional filters', () => {
    expect(
      createWorkbenchItemsRequest('PENDING', 1, 10, {
        keyword: ' ',
        documentType: 'ALL',
        applicantId: '',
        departmentId: '',
        status: 'ALL',
        dateRange: [],
      }),
    ).toEqual({ box: 'PENDING', page: 1, pageSize: 10 });
  });

  it('only sends applicant and status filters to boxes where they are visible', () => {
    const filters = {
      keyword: '',
      documentType: 'ALL' as const,
      applicantId: 'user-1',
      departmentId: '',
      status: 'IN_REVIEW' as const,
      dateRange: [],
    };

    expect(createWorkbenchItemsRequest('PENDING', 1, 20, filters)).toMatchObject({
      applicantId: 'user-1',
      status: undefined,
    });
    expect(createWorkbenchItemsRequest('MINE', 1, 20, filters)).toMatchObject({
      applicantId: undefined,
      status: 'IN_REVIEW',
    });
    expect(createWorkbenchItemsRequest('COPIED', 1, 20, filters)).toMatchObject({
      applicantId: 'user-1',
      status: 'IN_REVIEW',
    });
  });

  it('resolves all workbench tabs while enforcing optional content and follow permissions', () => {
    expect(resolveWorkbenchTab('copied', false, false)).toBe('copied');
    expect(resolveWorkbenchTab('unread', false, true)).toBe('pending');
    expect(resolveWorkbenchTab('following', true, false)).toBe('pending');
    expect(resolveWorkbenchTab('following', true, true)).toBe('following');
    expect(resolveWorkbenchTab('unknown', true, true)).toBe('pending');
  });
});
