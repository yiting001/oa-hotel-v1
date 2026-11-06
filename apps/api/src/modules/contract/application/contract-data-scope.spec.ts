import type { SessionUser } from '@oa/contracts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataSource } from 'typeorm';
import { IamService } from '../../../common/iam/application/iam.service';
import { DocumentNumberService } from '../../../common/workflow/application/document-number.service';
import { DocumentWorkflowService } from '../../../common/workflow/application/document-workflow.service';
import { DocumentIndexEntity } from '../../../common/workflow/infrastructure/document-index.entity';
import type { ContractRepository } from '../domain/contract.repository';
import { ContractEntity } from '../infrastructure/contract.entity';
import { ContractRequestEntity } from '../infrastructure/contract-request.entity';
import type { ContractApprovalDto, ContractPaymentDto } from '../presentation/contract.dto';
import { ContractApplicationService } from './contract-application.service';

describe('ContractApplicationService data scope', () => {
  let repository: ContractRepository;
  let workflow: {
    getDocument: ReturnType<typeof vi.fn<DocumentWorkflowService['getDocument']>>;
    readOpinions: ReturnType<typeof vi.fn<DocumentWorkflowService['readOpinions']>>;
    registerDraft: ReturnType<typeof vi.fn<DocumentWorkflowService['registerDraft']>>;
  };
  let iam: {
    canAccessResource: ReturnType<typeof vi.fn<IamService['canAccessResource']>>;
    listDepartments: ReturnType<typeof vi.fn<IamService['listDepartments']>>;
  };
  let documentNumbers: {
    generateForDepartment: ReturnType<
      typeof vi.fn<DocumentNumberService['generateForDepartment']>
    >;
  };
  let dataSource: { manager: unknown };
  let service: ContractApplicationService;

  beforeEach(() => {
    repository = {
      saveRequest: vi.fn<ContractRepository['saveRequest']>(),
      findRequest: vi.fn<ContractRepository['findRequest']>(),
      saveContract: vi.fn<ContractRepository['saveContract']>(),
      findContract: vi.fn<ContractRepository['findContract']>(),
      listContracts: vi.fn<ContractRepository['listContracts']>(),
      savePayment: vi.fn<ContractRepository['savePayment']>(),
      findPayment: vi.fn<ContractRepository['findPayment']>(),
    };
    workflow = {
      getDocument: vi.fn<DocumentWorkflowService['getDocument']>(),
      readOpinions: vi.fn<DocumentWorkflowService['readOpinions']>(),
      registerDraft: vi.fn<DocumentWorkflowService['registerDraft']>(),
    };
    iam = {
      canAccessResource: vi.fn<IamService['canAccessResource']>(),
      listDepartments: vi.fn<IamService['listDepartments']>(),
    };
    iam.listDepartments.mockResolvedValue([
      { id: 'dept-child', name: '测试部门', children: [] },
    ] as never);
    documentNumbers = {
      generateForDepartment: vi.fn<DocumentNumberService['generateForDepartment']>(),
    };
    documentNumbers.generateForDepartment.mockResolvedValue('YWB20260101-001');
    dataSource = { manager: {} };
    workflow.readOpinions.mockResolvedValue([]);
    service = new ContractApplicationService(
      repository,
      workflow as unknown as DocumentWorkflowService,
      documentNumbers as unknown as DocumentNumberService,
      dataSource as unknown as DataSource,
      iam as unknown as IamService,
    );
  });

  it('allows a custom role to create payment through its secondary department scope', async () => {
    const contract = contractFixture('contract-child', 'owner-child', 'dept-child');
    vi.mocked(repository.findContract).mockResolvedValue(contract);
    vi.mocked(repository.savePayment).mockImplementation(async (entity) => entity);
    workflow.getDocument.mockResolvedValue(documentFixture(contract.id, 'APPROVED'));
    workflow.registerDraft.mockResolvedValue(documentFixture(contract.id, 'DRAFT'));
    iam.canAccessResource.mockImplementation(
      async (_userId, permissionCode, _ownerUserId, departmentId) =>
        permissionCode === 'CONTRACT_CREATE' && departmentId === 'dept-child',
    );

    await expect(service.savePayment(paymentDto(contract.id), scopedUser)).resolves.toMatchObject({
      data: {
        contractId: contract.id,
        applicantId: scopedUser.id,
        contractAmountCents: contract.amountCents,
        counterpartyFullName: contract.counterpartyFullName,
      },
    });
    expect(iam.canAccessResource).toHaveBeenCalledWith(
      scopedUser.id,
      'CONTRACT_CREATE',
      contract.applicantId,
      contract.signingDepartmentId,
    );
  });

  it('uses department-tree and self grants when listing approved contracts', async () => {
    const contracts = [
      contractFixture('contract-child', 'owner-child', 'dept-child'),
      contractFixture('contract-self', scopedUser.id, 'dept-outside'),
      contractFixture('contract-denied', 'owner-other', 'dept-outside'),
      contractFixture('contract-draft', 'owner-child', 'dept-child'),
    ];
    vi.mocked(repository.listContracts).mockResolvedValue(contracts);
    workflow.getDocument.mockImplementation(async (id) =>
      documentFixture(id, id === 'contract-draft' ? 'DRAFT' : 'APPROVED'),
    );
    iam.canAccessResource.mockImplementation(
      async (userId, permissionCode, ownerUserId, departmentId) =>
        permissionCode === 'CONTRACT_VIEW' &&
        (ownerUserId === userId || departmentId === 'dept-child'),
    );

    const results = await service.listContracts(scopedUser);

    expect(results.map((result) => result.data.id)).toEqual(['contract-child', 'contract-self']);
    expect(workflow.readOpinions).toHaveBeenCalledTimes(2);
    expect(iam.canAccessResource).not.toHaveBeenCalledWith(
      scopedUser.id,
      'CONTRACT_VIEW',
      'owner-child',
      'dept-child-draft',
    );
  });

  it('rejects payment creation with a stable error when no data scope grants access', async () => {
    const contract = contractFixture('contract-denied', 'owner-other', 'dept-outside');
    vi.mocked(repository.findContract).mockResolvedValue(contract);
    iam.canAccessResource.mockResolvedValue(false);

    await expect(service.savePayment(paymentDto(contract.id), scopedUser)).rejects.toMatchObject({
      code: 'CONTRACT_DATA_SCOPE_DENIED',
    });
    expect(workflow.getDocument).not.toHaveBeenCalled();
    expect(repository.savePayment).not.toHaveBeenCalled();
  });

  it('links an own request in any status but rejects requests owned by others', async () => {
    vi.mocked(repository.findRequest).mockResolvedValue(requestFixture('request-mine'));
    vi.mocked(repository.saveContract).mockImplementation(async (entity) => entity);
    workflow.getDocument.mockResolvedValue(
      documentFixture('request-mine', 'DRAFT', { applicantId: scopedUser.id }),
    );

    const saved = await service.saveContract(approvalDto('request-mine'), scopedUser);
    expect(saved.data.requestId).toBe('request-mine');
    expect(workflow.registerDraft).toHaveBeenCalled();

    vi.mocked(repository.findRequest).mockResolvedValue(requestFixture('request-other'));
    vi.mocked(repository.saveContract).mockClear();
    workflow.getDocument.mockResolvedValue(
      documentFixture('request-other', 'APPROVED', { applicantId: 'owner-other' }),
    );

    await expect(service.saveContract(approvalDto('request-other'), scopedUser)).rejects.toMatchObject(
      { code: 'CONTRACT_REQUEST_NOT_OWNED' },
    );
    expect(repository.saveContract).not.toHaveBeenCalled();
  });
});

const scopedUser: SessionUser = {
  id: 'user-operator',
  username: 'operator',
  displayName: '合同经办人',
  departmentId: 'dept-primary',
  departmentName: '主部门',
  roleCodes: ['CUSTOM_CONTRACT_OPERATOR'],
  permissionCodes: ['DOCUMENT_CREATE', 'DOCUMENT_VIEW', 'CONTRACT_CREATE', 'CONTRACT_VIEW'],
  memberships: [
    membership('membership-primary', 'dept-primary', true),
    membership('membership-secondary', 'dept-child', false),
  ],
  dataScopes: [
    {
      roleCode: 'CUSTOM_CONTRACT_OPERATOR',
      permissionCodes: ['CONTRACT_CREATE', 'CONTRACT_VIEW'],
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

function contractFixture(id: string, applicantId: string, signingDepartmentId: string) {
  return Object.assign(new ContractEntity(), {
    id,
    number: `CONTRACT-${id}`,
    requestId: null,
    signingDepartmentId,
    signingDate: '2026-07-01',
    name: '测试合同',
    amountCents: 100_000,
    counterpartyFullName: '测试供应商',
    contentReason: '测试',
    sealType: null,
    applicantId,
    attachments: [],
  });
}

function documentFixture(
  id: string,
  status: string,
  overrides: Partial<DocumentIndexEntity> = {},
) {
  return Object.assign(new DocumentIndexEntity(), {
    id,
    documentType: 'CONTRACT_APPROVAL',
    module: 'CONTRACT',
    title: id,
    applicantId: 'owner-child',
    departmentId: 'dept-child',
    status,
    revision: 1,
    currentStep: null,
    workflowCode: 'CONTRACT_APPROVAL_DEFAULT',
    processVersionId: null,
    formVersionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

function requestFixture(id: string) {
  return Object.assign(new ContractRequestEntity(), {
    id,
    number: `CONTRACT-REQUEST-${id}`,
    title: `请示-${id}`,
    departmentId: 'dept-child',
    applicantId: scopedUser.id,
    requestedAt: '2026-07-01',
    amountCents: 100_000,
    content: '测试请示',
    addressee: '',
    issuer: '',
    attachments: [],
  });
}

function approvalDto(requestId: string): ContractApprovalDto {
  return {
    requestId,
    signingDepartmentId: 'dept-child',
    signingDate: '2026-07-01',
    name: '测试合同',
    amountCents: 100_000,
    counterpartyFullName: '测试供应商',
    counterpartyContact: null,
    counterpartyPhone: null,
    validFrom: null,
    validTo: null,
    contentReason: '测试',
    remark: null,
    sealType: null,
    attachments: [],
  };
}

function paymentDto(contractId: string): ContractPaymentDto {
  return {
    contractId,
    project: '合同付款',
    contractStartDate: '2026-07-01',
    contractEndDate: '2027-06-30',
    contractSigningDate: '2000-01-01',
    contractAmountCents: 1,
    budgetAmountCents: 100_000,
    budgetExecutedCents: 0,
    accountingSubject: '管理费用',
    maintenanceEstimateCents: null,
    counterpartyFullName: '不信任的客户端值',
    plannedPaymentCount: 2,
    paymentSequence: 1,
    executedAmountCents: 0,
    plannedProgress: '50%',
    actualProgress: '50%',
    paymentMethod: 'OTHER',
    paymentReason: '阶段付款',
    invoiceNumber: null,
    warrantyStartDate: null,
    warrantyEndDate: null,
    paymentAmountCents: 10_000,
    attachments: [],
  };
}
