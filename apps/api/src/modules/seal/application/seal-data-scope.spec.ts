import type { SessionUser } from '@oa/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IamService } from '../../../common/iam/application/iam.service';
import { DocumentWorkflowService } from '../../../common/workflow/application/document-workflow.service';
import { DocumentIndexEntity } from '../../../common/workflow/infrastructure/document-index.entity';
import type { SealRepository } from '../domain/seal.repository';
import { SealBorrowEntity } from '../infrastructure/seal-borrow.entity';
import { SealUseEntity } from '../infrastructure/seal-use.entity';
import { SealApplicationService } from './seal-application.service';

describe('SealApplicationService data scope', () => {
  let repository: SealRepository;
  let workflow: {
    getEditable: ReturnType<typeof vi.fn<DocumentWorkflowService['getEditable']>>;
    getDocument: ReturnType<typeof vi.fn<DocumentWorkflowService['getDocument']>>;
    readOpinions: ReturnType<typeof vi.fn<DocumentWorkflowService['readOpinions']>>;
    updateDraftTitle: ReturnType<typeof vi.fn<DocumentWorkflowService['updateDraftTitle']>>;
  };
  let iam: {
    canAccessResource: ReturnType<typeof vi.fn<IamService['canAccessResource']>>;
  };
  let service: SealApplicationService;

  beforeEach(() => {
    repository = {
      countAssets: vi.fn<SealRepository['countAssets']>(),
      saveAssets: vi.fn<SealRepository['saveAssets']>(),
      listAssets: vi.fn<SealRepository['listAssets']>(),
      findAssets: vi.fn<SealRepository['findAssets']>(),
      checkoutAssets: vi.fn<SealRepository['checkoutAssets']>(),
      returnAssets: vi.fn<SealRepository['returnAssets']>(),
      saveBorrow: vi.fn<SealRepository['saveBorrow']>(),
      findBorrow: vi.fn<SealRepository['findBorrow']>(),
      saveUse: vi.fn<SealRepository['saveUse']>(),
      findUse: vi.fn<SealRepository['findUse']>(),
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
    vi.mocked(repository.saveBorrow).mockImplementation(async (entity) => entity);
    vi.mocked(repository.saveUse).mockImplementation(async (entity) => entity);
    service = new SealApplicationService(
      repository,
      workflow as unknown as DocumentWorkflowService,
      iam as unknown as IamService,
    );
  });

  it('syncs the workflow title when an editable borrow request changes destination', async () => {
    const borrow = borrowFixture('NOT_CHECKED_OUT');
    vi.mocked(repository.findBorrow).mockResolvedValue(borrow);
    vi.mocked(repository.findAssets).mockResolvedValue([
      {
        id: 'seal-company',
        code: 'SEAL-COMPANY',
        name: '公司公章',
        type: 'SEAL',
        custodianUserId: 'user-office',
        status: 'AVAILABLE',
        activeBorrowRequestId: null,
        validUntil: null,
      },
    ]);
    workflow.getEditable.mockResolvedValue(documentFixture('DRAFT'));

    await service.saveBorrow(
      {
        useDate: '2026-07-13',
        plannedReturnDate: '2026-07-14',
        companionIds: [],
        destination: '政务服务中心',
        sealAssetIds: ['seal-company'],
        content: '办理证照变更',
        attachments: [],
      },
      scopedUser,
      borrow.id,
    );

    expect(workflow.updateDraftTitle).toHaveBeenCalledWith(
      borrow.id,
      '印章证照外借：政务服务中心',
      scopedUser,
    );
  });

  it('allows a custom department-tree role to checkout and return a child department borrow', async () => {
    const borrow = borrowFixture('NOT_CHECKED_OUT');
    vi.mocked(repository.findBorrow).mockResolvedValue(borrow);
    iam.canAccessResource.mockImplementation(
      async (_userId, permissionCode, _ownerUserId, departmentId) =>
        permissionCode === 'SEAL_EXECUTE' && departmentId === 'dept-child',
    );

    await service.checkout(
      borrow.id,
      { actualRecipient: '领用人', checkedOutAt: '2026-07-13T10:00:00.000Z' },
      scopedUser,
    );
    await service.returnBorrow(
      borrow.id,
      {
        returnedAt: '2026-07-13T18:00:00.000Z',
        returnCondition: '完好',
        exceptionNote: null,
      },
      scopedUser,
    );

    expect(repository.checkoutAssets).toHaveBeenCalledWith(borrow.sealAssetIds, borrow.id);
    expect(repository.returnAssets).toHaveBeenCalledWith(borrow.sealAssetIds);
    expect(iam.canAccessResource).toHaveBeenCalledTimes(2);
    expect(scopedUser.roleCodes).not.toContain('SEAL_MANAGER');
  });

  it('allows a multi-department custom role to execute an approved use request', async () => {
    const request = useFixture();
    vi.mocked(repository.findUse).mockResolvedValue(request);
    iam.canAccessResource.mockResolvedValue(true);

    await expect(
      service.executeUse(
        request.id,
        {
          stampedCopies: 2,
          executedAt: '2026-07-13T10:00:00.000Z',
          archiveNumber: 'ARCHIVE-001',
          executionNote: null,
        },
        scopedUser,
      ),
    ).resolves.toMatchObject({ data: { executionStatus: 'EXECUTED' } });
    expect(iam.canAccessResource).toHaveBeenCalledWith(
      scopedUser.id,
      'SEAL_EXECUTE',
      request.applicantId,
      request.departmentId,
    );
  });

  it.each(['checkout', 'return', 'execute'] as const)(
    'rejects %s with a stable error when data scope is missing',
    async (command) => {
      const borrow = borrowFixture(command === 'return' ? 'CHECKED_OUT' : 'NOT_CHECKED_OUT');
      const use = useFixture();
      vi.mocked(repository.findBorrow).mockResolvedValue(borrow);
      vi.mocked(repository.findUse).mockResolvedValue(use);
      iam.canAccessResource.mockResolvedValue(false);

      const operation =
        command === 'checkout'
          ? service.checkout(
              borrow.id,
              { actualRecipient: '领用人', checkedOutAt: '2026-07-13T10:00:00.000Z' },
              scopedUser,
            )
          : command === 'return'
            ? service.returnBorrow(
                borrow.id,
                {
                  returnedAt: '2026-07-13T18:00:00.000Z',
                  returnCondition: '完好',
                  exceptionNote: null,
                },
                scopedUser,
              )
            : service.executeUse(
                use.id,
                {
                  stampedCopies: 2,
                  executedAt: '2026-07-13T10:00:00.000Z',
                  archiveNumber: 'ARCHIVE-001',
                  executionNote: null,
                },
                scopedUser,
              );

      await expect(operation).rejects.toMatchObject({ code: 'SEAL_DATA_SCOPE_DENIED' });
      expect(workflow.getDocument).not.toHaveBeenCalled();
    },
  );

  it('keeps approval-state validation after access is granted', async () => {
    const request = useFixture();
    vi.mocked(repository.findUse).mockResolvedValue(request);
    iam.canAccessResource.mockResolvedValue(true);
    workflow.getDocument.mockResolvedValue(documentFixture('IN_REVIEW'));

    await expect(
      service.executeUse(
        request.id,
        {
          stampedCopies: 2,
          executedAt: '2026-07-13T10:00:00.000Z',
          archiveNumber: 'ARCHIVE-001',
          executionNote: null,
        },
        scopedUser,
      ),
    ).rejects.toMatchObject({ code: 'DOCUMENT_NOT_APPROVED' });
  });
});

const scopedUser: SessionUser = {
  id: 'seal-operator',
  username: 'seal-operator',
  displayName: '用印经办人',
  departmentId: 'dept-primary',
  departmentName: '主部门',
  roleCodes: ['CUSTOM_SEAL_OPERATOR'],
  permissionCodes: ['SEAL_EXECUTE'],
  memberships: [
    membership('seal-primary', 'dept-primary', true),
    membership('seal-secondary', 'dept-child', false),
  ],
  dataScopes: [
    {
      roleCode: 'CUSTOM_SEAL_OPERATOR',
      permissionCodes: ['SEAL_EXECUTE'],
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

function borrowFixture(executionStatus: string) {
  return Object.assign(new SealBorrowEntity(), {
    id: 'borrow-child',
    number: 'SEAL-BORROW-001',
    applicantId: 'borrow-owner',
    departmentId: 'dept-child',
    applicationDate: '2026-07-12',
    useDate: '2026-07-13',
    plannedReturnDate: '2026-07-14',
    companionIds: [],
    destination: '客户现场',
    sealAssetIds: ['seal-company'],
    content: '合同签署',
    attachments: [],
    executionStatus,
    actualRecipient: null,
    checkedOutAt: null,
    returnedAt: null,
    returnCondition: null,
    exceptionNote: null,
  });
}

function useFixture() {
  return Object.assign(new SealUseEntity(), {
    id: 'use-child',
    number: 'SEAL-USE-001',
    applicantId: 'use-owner',
    departmentId: 'dept-child',
    applicationDate: '2026-07-12',
    useDate: '2026-07-13',
    purpose: '合同签署',
    sealAssetIds: ['seal-company'],
    content: '合同签署',
    attachments: [],
    executionStatus: 'NOT_EXECUTED',
    stampedCopies: null,
    executedAt: null,
    archiveNumber: null,
    executionNote: null,
  });
}

function documentFixture(status: string) {
  return Object.assign(new DocumentIndexEntity(), {
    id: 'document-id',
    documentType: 'SEAL_USE',
    module: 'SEAL',
    title: '用印申请',
    applicantId: 'use-owner',
    departmentId: 'dept-child',
    status,
    revision: 1,
    currentStep: null,
    workflowCode: 'SEAL_USE_DEFAULT',
    processVersionId: null,
    formVersionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
