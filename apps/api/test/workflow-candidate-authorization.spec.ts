import { ForbiddenException, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { SessionUser } from '@oa/contracts';
import { randomUUID } from 'node:crypto';
import type { Repository } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthService } from '../src/common/auth/auth.service';
import { UserEntity } from '../src/common/auth/user.entity';
import { IamService } from '../src/common/iam/application/iam.service';
import { DataScope } from '../src/common/iam/domain/data-scope';
import { DocumentWorkflowService } from '../src/common/workflow/application/document-workflow.service';
import { DocumentIndexEntity } from '../src/common/workflow/infrastructure/document-index.entity';
import { WorkflowDefinitionEntity } from '../src/common/workflow/infrastructure/workflow-definition.entity';
import { WorkflowTaskCandidateEntity } from '../src/common/workflow/infrastructure/workflow-task-candidate.entity';
import { WorkflowTaskEntity } from '../src/common/workflow/infrastructure/workflow-task.entity';

describe('工作流候选人有效授权', () => {
  let app: INestApplication;
  let auth: AuthService;
  let iam: IamService;
  let workflow: DocumentWorkflowService;
  let users: Repository<UserEntity>;
  let documents: Repository<DocumentIndexEntity>;
  let definitions: Repository<WorkflowDefinitionEntity>;
  let tasks: Repository<WorkflowTaskEntity>;
  let candidates: Repository<WorkflowTaskCandidateEntity>;

  beforeAll(async () => {
    process.env.OA_DATABASE_PATH = ':memory:';
    process.env.JWT_SECRET = 'workflow-candidate-authorization-secret';
    process.env.OA_DEMO_PASSWORD = 'Demo123!';
    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    auth = moduleRef.get(AuthService);
    iam = moduleRef.get(IamService);
    workflow = moduleRef.get(DocumentWorkflowService);
    users = moduleRef.get(getRepositoryToken(UserEntity));
    documents = moduleRef.get(getRepositoryToken(DocumentIndexEntity));
    definitions = moduleRef.get(getRepositoryToken(WorkflowDefinitionEntity));
    tasks = moduleRef.get(getRepositoryToken(WorkflowTaskEntity));
    candidates = moduleRef.get(getRepositoryToken(WorkflowTaskCandidateEntity));
  });

  afterAll(async () => {
    await app?.close();
  });

  it('不会用另一角色的全部范围扩大跨部门业务查看权限', async () => {
    const candidateRole = await iam.createRole({
      code: 'SCOPED_WORKFLOW_CANDIDATE',
      name: '范围隔离候选人',
    });
    const globalApprovalRole = await iam.createRole({
      code: 'GLOBAL_APPROVAL_READER',
      name: '全局审批查看人',
    });
    const scopedContractRole = await iam.createRole({
      code: 'SCOPED_CONTRACT_READER',
      name: '指定部门合同查看人',
    });
    const permissions = new Map(
      (await iam.listPermissions()).map((permission) => [permission.code, permission.id]),
    );

    await iam.updateRolePermissions(globalApprovalRole.id, [
      requiredPermissionId(permissions, 'WORKFLOW_APPROVE'),
      requiredPermissionId(permissions, 'DOCUMENT_VIEW'),
    ]);
    await iam.updateRolePermissions(scopedContractRole.id, [
      requiredPermissionId(permissions, 'CONTRACT_VIEW'),
    ]);
    await users.save({
      id: 'user-scoped-workflow-candidate',
      username: 'scoped-workflow-candidate',
      displayName: '范围隔离候选人',
      passwordHash: 'unused',
      departmentId: 'dept-business',
      roleCodes: [],
      active: true,
    });
    await assignCandidateRoles(iam, {
      candidateRoleId: candidateRole.id,
      globalApprovalRoleId: globalApprovalRole.id,
      scopedContractRoleId: scopedContractRole.id,
      contractDataScope: DataScope.DEPARTMENT,
      contractScopeDepartmentId: 'dept-supply',
    });

    const documentId = randomUUID();
    const workflowCode = `SCOPED_CANDIDATE_${documentId}`;
    await definitions.save({
      code: workflowCode,
      documentType: `SCOPED_CANDIDATE_TEST_${documentId}`,
      name: '候选人授权范围隔离流程',
      steps: [candidateRole.code],
      version: 1,
      active: true,
    });
    await documents.save({
      id: documentId,
      documentType: 'CONTRACT_APPROVAL',
      module: 'CONTRACT',
      title: '候选人授权范围隔离',
      applicantId: 'user-applicant',
      departmentId: 'dept-business',
      status: 'DRAFT',
      revision: 1,
      currentStep: null,
      workflowCode,
      processVersionId: null,
      formVersionId: null,
    });

    await expect(
      workflow.submit(documentId, randomUUID(), applicantSession()),
    ).rejects.toMatchObject({
      code: 'WORKFLOW_ASSIGNEE_PERMISSION_MISSING',
      details: {
        requiredPermissions: ['WORKFLOW_APPROVE', 'DOCUMENT_VIEW', 'CONTRACT_VIEW'],
        resolvedCandidateCount: 1,
      },
    });
    expect(await documents.findOneByOrFail({ id: documentId })).toMatchObject({
      status: 'DRAFT',
      revision: 1,
      currentStep: null,
    });
    expect(await tasks.countBy({ documentId })).toBe(0);

    await assignCandidateRoles(iam, {
      candidateRoleId: candidateRole.id,
      globalApprovalRoleId: globalApprovalRole.id,
      scopedContractRoleId: scopedContractRole.id,
      contractDataScope: DataScope.SELF,
    });
    await expect(
      workflow.submit(documentId, randomUUID(), applicantSession()),
    ).rejects.toMatchObject({ code: 'WORKFLOW_ASSIGNEE_PERMISSION_MISSING' });
    expect(await tasks.countBy({ documentId })).toBe(0);

    await assignCandidateRoles(iam, {
      candidateRoleId: candidateRole.id,
      globalApprovalRoleId: globalApprovalRole.id,
      scopedContractRoleId: scopedContractRole.id,
      contractDataScope: DataScope.DEPARTMENT,
      contractScopeDepartmentId: 'dept-business',
    });
    await expect(
      workflow.submit(documentId, randomUUID(), applicantSession()),
    ).resolves.toMatchObject({
      status: 'IN_REVIEW',
      revision: 2,
      currentStep: 0,
    });
    const task = await tasks.findOneByOrFail({ documentId, status: 'PENDING' });
    expect(await candidates.findBy({ taskId: task.id })).toEqual([
      expect.objectContaining({
        taskId: task.id,
        userId: 'user-scoped-workflow-candidate',
        source: 'ROLE',
        roleCode: candidateRole.code,
        departmentId: 'dept-business',
      }),
    ]);
  });

  it('撤销业务模块查看权限后不能直接审批或退回，恢复授权后重试仍幂等', async () => {
    const candidateRole = await iam.createRole({
      code: 'REVOCABLE_WORKFLOW_CANDIDATE',
      name: '可撤权流程候选人',
    });
    const approvalRole = await iam.createRole({
      code: 'REVOCABLE_WORKFLOW_APPROVER',
      name: '可撤权流程审批人',
    });
    const contractRole = await iam.createRole({
      code: 'REVOCABLE_CONTRACT_READER',
      name: '可撤权合同查看人',
    });
    const permissions = new Map(
      (await iam.listPermissions()).map((permission) => [permission.code, permission.id]),
    );
    const workflowApprovePermissionId = requiredPermissionId(permissions, 'WORKFLOW_APPROVE');
    const documentViewPermissionId = requiredPermissionId(permissions, 'DOCUMENT_VIEW');
    const contractViewPermissionId = requiredPermissionId(permissions, 'CONTRACT_VIEW');

    await iam.updateRolePermissions(approvalRole.id, [
      workflowApprovePermissionId,
      documentViewPermissionId,
    ]);
    await iam.updateRolePermissions(contractRole.id, [contractViewPermissionId]);
    await users.save({
      id: 'user-revocable-workflow-candidate',
      username: 'revocable-workflow-candidate',
      displayName: '可撤权流程候选人',
      passwordHash: 'unused',
      departmentId: 'dept-business',
      roleCodes: [],
      active: true,
    });
    await iam.updateUserAssignments('user-revocable-workflow-candidate', {
      memberships: [{ departmentId: 'dept-business', isPrimary: true }],
      roles: [
        {
          roleId: candidateRole.id,
          dataScope: DataScope.DEPARTMENT,
          scopeDepartmentId: 'dept-business',
        },
        { roleId: approvalRole.id, dataScope: DataScope.ALL },
        {
          roleId: contractRole.id,
          dataScope: DataScope.DEPARTMENT,
          scopeDepartmentId: 'dept-business',
        },
      ],
    });

    const documentId = randomUUID();
    const workflowCode = `REVOCABLE_CANDIDATE_${documentId}`;
    await definitions.save({
      code: workflowCode,
      documentType: `REVOCABLE_CANDIDATE_TEST_${documentId}`,
      name: '候选人实时授权流程',
      steps: [candidateRole.code],
      version: 1,
      active: true,
    });
    await documents.save({
      id: documentId,
      documentType: 'CONTRACT_APPROVAL',
      module: 'CONTRACT',
      title: '候选人撤权审批保护',
      applicantId: 'user-applicant',
      departmentId: 'dept-business',
      status: 'DRAFT',
      revision: 1,
      currentStep: null,
      workflowCode,
      processVersionId: null,
      formVersionId: null,
    });
    await workflow.submit(documentId, randomUUID(), applicantSession());
    const task = await tasks.findOneByOrFail({ documentId, status: 'PENDING' });

    await iam.updateRolePermissions(approvalRole.id, [documentViewPermissionId]);
    const approvalRevokedUser = await auth.getSessionUser('user-revocable-workflow-candidate');
    expect(await workflow.listTasks(approvalRevokedUser)).toEqual([]);

    await iam.updateRolePermissions(approvalRole.id, [
      workflowApprovePermissionId,
      documentViewPermissionId,
    ]);
    const authorizedPendingUser = await auth.getSessionUser('user-revocable-workflow-candidate');
    expect((await workflow.listTasks(authorizedPendingUser)).map((item) => item.id)).toContain(
      task.id,
    );

    await iam.updateRolePermissions(contractRole.id, []);
    const revokedUser = await auth.getSessionUser('user-revocable-workflow-candidate');
    expect(revokedUser.permissionCodes).toEqual(
      expect.arrayContaining(['WORKFLOW_APPROVE', 'DOCUMENT_VIEW']),
    );
    expect(revokedUser.permissionCodes).not.toContain('CONTRACT_VIEW');
    expect(await workflow.listTasks(revokedUser)).toEqual([]);

    for (const action of ['APPROVE', 'RETURN'] as const) {
      await expect(
        workflow.completeTask(task.id, randomUUID(), '撤权后的越权尝试', action, revokedUser),
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
    expect(await tasks.findOneByOrFail({ id: task.id })).toMatchObject({
      status: 'PENDING',
      completedBy: null,
    });
    expect(await documents.findOneByOrFail({ id: documentId })).toMatchObject({
      status: 'IN_REVIEW',
      revision: 2,
      currentStep: 0,
    });

    await iam.updateRolePermissions(contractRole.id, [contractViewPermissionId]);
    const authorizedUser = await auth.getSessionUser('user-revocable-workflow-candidate');
    const requestId = randomUUID();
    await expect(
      workflow.completeTask(task.id, requestId, '恢复授权后同意', 'APPROVE', authorizedUser),
    ).resolves.toMatchObject({ status: 'APPROVED', revision: 3 });
    await expect(
      workflow.completeTask(task.id, requestId, '重复请求', 'APPROVE', authorizedUser),
    ).resolves.toMatchObject({ status: 'APPROVED', revision: 3 });
    expect(await tasks.findOneByOrFail({ id: task.id })).toMatchObject({
      status: 'COMPLETED',
      completedBy: authorizedUser.id,
    });
    expect((await workflow.listCompletedTasks(authorizedUser)).map((item) => item.id)).toContain(
      task.id,
    );

    await iam.updateRolePermissions(approvalRole.id, [documentViewPermissionId]);
    const formerApprover = await auth.getSessionUser('user-revocable-workflow-candidate');
    expect(formerApprover.permissionCodes).not.toContain('WORKFLOW_APPROVE');
    expect((await workflow.listCompletedTasks(formerApprover)).map((item) => item.id)).toContain(
      task.id,
    );

    await iam.updateRolePermissions(contractRole.id, []);
    const completedViewRevokedUser = await auth.getSessionUser('user-revocable-workflow-candidate');
    expect(await workflow.listCompletedTasks(completedViewRevokedUser)).toEqual([]);
  });
});

async function assignCandidateRoles(
  iam: IamService,
  input: {
    candidateRoleId: string;
    globalApprovalRoleId: string;
    scopedContractRoleId: string;
    contractDataScope: DataScope;
    contractScopeDepartmentId?: string;
  },
): Promise<void> {
  await iam.updateUserAssignments('user-scoped-workflow-candidate', {
    memberships: [{ departmentId: 'dept-business', isPrimary: true }],
    roles: [
      {
        roleId: input.candidateRoleId,
        dataScope: DataScope.DEPARTMENT,
        scopeDepartmentId: 'dept-business',
      },
      { roleId: input.globalApprovalRoleId, dataScope: DataScope.ALL },
      {
        roleId: input.scopedContractRoleId,
        dataScope: input.contractDataScope,
        scopeDepartmentId: input.contractScopeDepartmentId,
      },
    ],
  });
}

function requiredPermissionId(permissions: Map<string, string>, code: string): string {
  const id = permissions.get(code);
  if (!id) throw new Error(`测试缺少权限码 ${code}`);
  return id;
}

function applicantSession(): SessionUser {
  return {
    id: 'user-applicant',
    username: 'applicant',
    displayName: '业务申请人',
    departmentId: 'dept-business',
    departmentName: '业务部',
    roleCodes: ['APPLICANT'],
    permissionCodes: ['DOCUMENT_CREATE', 'DOCUMENT_VIEW', 'CONTRACT_CREATE', 'CONTRACT_VIEW'],
    memberships: [],
    dataScopes: [],
  };
}
