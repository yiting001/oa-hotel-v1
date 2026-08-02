import { describe, expect, it } from 'vitest';
import {
  createIssueLines,
  createPurchaseLine,
  createRequisitionLine,
  purchaseTotals,
  validateIssue,
  validatePurchase,
  validateRequisition,
} from './supply-form';
import type { MaterialItem, MaterialRequisitionRecord } from '../types';

const inventory: MaterialItem[] = [
  {
    id: 'material-a',
    code: 'A-001',
    name: '测试物资',
    specification: '标准规格',
    unit: '件',
    availableQuantity: '8',
    active: true,
  },
];

const requisition: MaterialRequisitionRecord = {
  id: 'requisition-1',
  number: 'MR-001',
  applicantId: 'user-1',
  departmentId: 'department-1',
  contactUserId: 'user-1',
  applicationDate: '2026-07-12',
  items: [
    {
      materialItemId: 'material-a',
      itemCode: 'A-001',
      name: '测试物资',
      specification: '标准规格',
      unit: '件',
      requestedQuantity: '5',
      issuedQuantity: null,
      purpose: '测试用途',
    },
  ],
  attachments: [],
  issueStatus: 'NOT_ISSUED',
  issuedAt: null,
  issuedBy: null,
};

describe('supply form domain', () => {
  it('calculates purchase totals from quantity and cent price', () => {
    const first = createPurchaseLine();
    Object.assign(first, { requestedQuantity: 2, referenceUnitPriceCents: 1250 });
    const second = createPurchaseLine();
    Object.assign(second, { requestedQuantity: 1.5, referenceUnitPriceCents: 2000 });

    expect(purchaseTotals([first, second])).toEqual({
      unitPriceTotalCents: 3250,
      amountTotalCents: 5500,
    });
  });

  it('requires complete positive purchase lines', () => {
    const errors = validatePurchase('2026-07-12', [createPurchaseLine()]);

    expect(errors['items.0.name']).toBeDefined();
    expect(errors['items.0.requestedQuantity']).toBeDefined();
    expect(errors['items.0.referenceUnitPriceCents']).toBeDefined();
  });

  it('rejects duplicate inventory selections in one requisition', () => {
    const first = createRequisitionLine();
    Object.assign(first, {
      materialItemId: 'material-a',
      requestedQuantity: 1,
      purpose: '用途一',
    });
    const second = createRequisitionLine();
    Object.assign(second, {
      materialItemId: 'material-a',
      requestedQuantity: 2,
      purpose: '用途二',
    });

    const errors = validateRequisition('2026-07-12', 'user-1', [first, second]);

    expect(errors['items.1.materialItemId']).toContain('合并');
  });

  it('enforces inventory, requested quantity and one timestamp for a single issue command', () => {
    const lines = createIssueLines(requisition);
    lines[0] = {
      ...lines[0],
      issuedQuantity: 9,
      issuedAt: '2026-07-12T10:00',
    };

    const errors = validateIssue(lines, requisition, inventory);

    expect(errors['items.0.issuedQuantity']).toContain('可用库存');
  });
});
