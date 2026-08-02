import type { SessionUser } from '@oa/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IamService } from '../../../common/iam/application/iam.service';
import { DocumentWorkflowService } from '../../../common/workflow/application/document-workflow.service';
import { DocumentIndexEntity } from '../../../common/workflow/infrastructure/document-index.entity';
import type { SupplyRepository } from '../domain/supply.repository';
import { MaterialRequisitionEntity } from '../infrastructure/material-requisition.entity';
import { SupplyApplicationService } from './supply-application.service';

describe('SupplyApplicationService data scope', () => {
  let repository: SupplyRepository;
  let workflow: {
    getEditable: ReturnType<typeof vi.fn<DocumentWorkflowService['getEditable']>>;
    getDocument: ReturnType<typeof vi.fn<DocumentWorkflowService['getDocument']>>;
    readOpinions: ReturnType<typeof vi.fn<DocumentWorkflowService['readOpinions']>>;
    updateDraftTitle: ReturnType<typeof vi.fn<DocumentWorkflowService['updateDraftTitle']>>;
  };
  let iam: {
    canAccessResource: ReturnType<typeof vi.fn<IamService['canAccessResource']>>;
  };
  let service: SupplyApplicationService;

  beforeEach(() => {
    repository = {
      countItems: vi.fn<SupplyRepository['countItems']>(),
      saveItems: vi.fn<SupplyRepository['saveItems']>(),
      listItems: vi.fn<SupplyRepository['listItems']>(),
      findItems: vi.fn<SupplyRepository['findItems']>(),
      savePurchase: vi.fn<SupplyRepository['savePurchase']>(),
      findPurchase: vi.fn<SupplyRepository['findPurchase']>(),
      saveRequisition: vi.fn<SupplyRepository['saveRequisition']>(),
      findRequisition: vi.fn<SupplyRepository['findRequisition']>(),
      issueItems: vi.fn<SupplyRepository['issueItems']>(),
    };
    workflow = {
      getEditable: vi.fn<DocumentWorkflowService['getEditable']>(),
      getDocument: vi.fn<DocumentWorkflowService['getDocument']>(),
      readOpinions: vi.fn<DocumentWorkflowService['readOpinions']>(),
      updateDraftTitle: vi.fn<DocumentWorkflowService['updateDraftTitle']>(),
    };
    iam = {
      canAccessResource: vi.fn<IamService['canAccessResource']>(),
    };
    workflow.getDocument.mockResolvedValue(documentFixture('APPROVED'));
    workflow.readOpinions.mockResolvedValue([]);
    vi.mocked(repository.issueItems).mockImplementation(async (requisition, items, userId, at) =>
      Object.assign(requisition, {
        items,
        issueStatus: 'ISSUED',
        issuedBy: userId,
        issuedAt: at,
      }),
    );
    service = new SupplyApplicationService(
      repository,
      workflow as unknown as DocumentWorkflowService,
      iam as unknown as IamService,
    );
  });

  it('syncs the workflow title when an editable purchase changes its first item', async () => {
    vi.mocked(repository.findPurchase).mockResolvedValue({
      id: 'purchase-child',
      number: 'MATERIAL-PURCHASE-001',
      applicantId: 'request-owner',
      departmentId: 'dept-child',
      applicationDate: '2026-07-12',
      items: [],
      taxableUnitPriceTotalCents: 0,
      taxableAmountTotalCents: 0,
    });
    vi.mocked(repository.savePurchase).mockImplementation(async (entity) => entity);
    workflow.getEditable.mockResolvedValue(documentFixture('DRAFT'));

    await service.savePurchase(
      {
        applicationDate: '2026-07-13',
        items: [
          {
            name: '会议用纸',
            brand: null,
            specification: 'A4 80g',
            unit: '包',
            requestedQuantity: '2',
            monthlyConsumption: '1',
            referenceUnitPriceCents: 2500,
            remark: null,
          },
        ],
      },
      scopedUser,
      'purchase-child',
    );

    expect(workflow.updateDraftTitle).toHaveBeenCalledWith(
      'purchase-child',
      '物资申购：会议用纸等1项',
      scopedUser,
    );
  });

  it('allows a custom role to issue for a child department through its data scope', async () => {
    const requisition = requisitionFixture();
    vi.mocked(repository.findRequisition).mockResolvedValue(requisition);
    iam.canAccessResource.mockImplementation(
      async (_userId, permissionCode, _ownerUserId, departmentId) =>
        permissionCode === 'SUPPLY_ISSUE' && departmentId === 'dept-child',
    );

    await expect(
      service.issue(
        requisition.id,
        {
          issuedAt: '2026-07-13T10:00:00.000Z',
          items: [{ materialItemId: 'item-paper', issuedQuantity: '2' }],
        },
        scopedUser,
      ),
    ).resolves.toMatchObject({
      data: { issueStatus: 'ISSUED', issuedBy: scopedUser.id },
    });
    expect(iam.canAccessResource).toHaveBeenCalledWith(
      scopedUser.id,
      'SUPPLY_ISSUE',
      requisition.applicantId,
      requisition.departmentId,
    );
    expect(scopedUser.roleCodes).not.toContain('WAREHOUSE_MANAGER');
  });

  it('rejects issue with a stable error when no data scope grants access', async () => {
    const requisition = requisitionFixture();
    vi.mocked(repository.findRequisition).mockResolvedValue(requisition);
    iam.canAccessResource.mockResolvedValue(false);

    await expect(
      service.issue(
        requisition.id,
        {
          issuedAt: '2026-07-13T10:00:00.000Z',
          items: [{ materialItemId: 'item-paper', issuedQuantity: '2' }],
        },
        scopedUser,
      ),
    ).rejects.toMatchObject({ code: 'SUPPLY_DATA_SCOPE_DENIED' });
    expect(workflow.getDocument).not.toHaveBeenCalled();
    expect(repository.issueItems).not.toHaveBeenCalled();
  });

  it('keeps approval-state validation after access is granted', async () => {
    const requisition = requisitionFixture();
    vi.mocked(repository.findRequisition).mockResolvedValue(requisition);
    iam.canAccessResource.mockResolvedValue(true);
    workflow.getDocument.mockResolvedValue(documentFixture('IN_REVIEW'));

    await expect(
      service.issue(
        requisition.id,
        {
          issuedAt: '2026-07-13T10:00:00.000Z',
          items: [{ materialItemId: 'item-paper', issuedQuantity: '2' }],
        },
        scopedUser,
      ),
    ).rejects.toMatchObject({ code: 'DOCUMENT_NOT_APPROVED' });
  });
});

const scopedUser: SessionUser = {
  id: 'supply-operator',
  username: 'supply-operator',
  displayName: '物资经办人',
  departmentId: 'dept-primary',
  departmentName: '主部门',
  roleCodes: ['CUSTOM_SUPPLY_OPERATOR'],
  permissionCodes: ['SUPPLY_ISSUE'],
  memberships: [
    membership('supply-primary', 'dept-primary', true),
    membership('supply-secondary', 'dept-child', false),
  ],
  dataScopes: [
    {
      roleCode: 'CUSTOM_SUPPLY_OPERATOR',
      permissionCodes: ['SUPPLY_ISSUE'],
      scope: 'DEPARTMENT_TREE',
      scopeDepartmentId: 'dept-region',
    },
  ],
};

function membership(id: string, departmentId: string, isPrimary: boolean) {
  return {
    id,
    departmentId,
    departmentName: departmentId,
    positionId: null,
    positionName: null,
    isPrimary,
    isDepartmentHead: false,
    active: true,
  };
}

function requisitionFixture() {
  return Object.assign(new MaterialRequisitionEntity(), {
    id: 'requisition-child',
    number: 'MATERIAL-REQUISITION-001',
    applicantId: 'request-owner',
    departmentId: 'dept-child',
    contactUserId: 'contact-user',
    applicationDate: '2026-07-12',
    items: [
      {
        materialItemId: 'item-paper',
        itemCode: 'OFFICE-A4',
        name: 'A4 复印纸',
        specification: '80g',
        unit: '包',
        requestedQuantity: '3',
        issuedQuantity: null,
        purpose: '办公',
      },
    ],
    attachments: [],
    issueStatus: 'NOT_ISSUED',
    issuedAt: null,
    issuedBy: null,
  });
}

function documentFixture(status: string) {
  return Object.assign(new DocumentIndexEntity(), {
    id: 'requisition-child',
    documentType: 'MATERIAL_REQUISITION',
    module: 'SUPPLY',
    title: '物资领用',
    applicantId: 'request-owner',
    departmentId: 'dept-child',
    status,
    revision: 1,
    currentStep: null,
    workflowCode: 'MATERIAL_REQUISITION_DEFAULT',
    processVersionId: null,
    formVersionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
