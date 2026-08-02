import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import type { BusinessModule, WorkbenchBox } from '@oa/contracts';
import type { Repository } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DepartmentEntity } from '../../auth/department.entity';
import { UserEntity } from '../../auth/user.entity';
import { DocumentIndexEntity } from '../../workflow/infrastructure/document-index.entity';
import { WorkflowCopyEntity } from '../../workflow/infrastructure/workflow-copy.entity';
import { WorkflowTaskCandidateEntity } from '../../workflow/infrastructure/workflow-task-candidate.entity';
import { WorkflowTaskEntity } from '../../workflow/infrastructure/workflow-task.entity';
import { WORKBENCH_REPOSITORY, type WorkbenchRepository } from '../domain/workbench.repository';
import type { WorkbenchQuery, WorkbenchRepositoryContext } from '../domain/workbench.types';
import { TypeOrmWorkbenchRepository } from './typeorm-workbench.repository';
import { DocumentFollowEntity } from './document-follow.entity';

const entities = [
  DocumentIndexEntity,
  WorkflowTaskEntity,
  WorkflowTaskCandidateEntity,
  WorkflowCopyEntity,
  DocumentFollowEntity,
  UserEntity,
  DepartmentEntity,
];
const context: WorkbenchRepositoryContext = {
  userId: 'user-approver',
  allowedModules: ['CONTRACT'],
  canApprove: true,
  canFollow: true,
  moduleScopes: {
    CONTRACT: { all: false, self: false, departmentIds: ['dept-business'] },
  },
};

describe('TypeOrmWorkbenchRepository', () => {
  let moduleRef: TestingModule;
  let repository: WorkbenchRepository;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities,
          synchronize: true,
        }),
        TypeOrmModule.forFeature(entities),
      ],
      providers: [{ provide: WORKBENCH_REPOSITORY, useClass: TypeOrmWorkbenchRepository }],
    }).compile();
    repository = moduleRef.get(WORKBENCH_REPOSITORY);
    await seedRows(moduleRef);
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  it('returns only the current candidate and joins applicant and department names', async () => {
    const result = await repository.findPage(query('PENDING'), context);

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: 'task-pending-contract',
      taskId: 'task-pending-contract',
      documentId: 'doc-contract-b',
      applicantName: '业务申请人',
      departmentName: '业务部',
      assigneeRole: 'DEPARTMENT_MANAGER',
    });
  });

  it('applies module permission before total count and completed-task pagination', async () => {
    const first = await repository.findPage(query('COMPLETED', { pageSize: 1 }), context);
    const second = await repository.findPage(query('COMPLETED', { page: 2, pageSize: 1 }), context);

    expect(first.total).toBe(2);
    expect(second.total).toBe(2);
    expect(first.items.map((item) => item.id)).toEqual(['task-completed-contract-second']);
    expect(second.items.map((item) => item.id)).toEqual(['task-completed-contract']);
    await expect(repository.count('COMPLETED', context)).resolves.toBe(2);
    await expect(repository.count('PENDING', context)).resolves.toBe(1);
    await expect(repository.count('PENDING', { ...context, allowedModules: [] })).resolves.toBe(0);
    await expect(repository.count('PENDING', { ...context, canApprove: false })).resolves.toBe(0);
    await expect(
      repository.findPage(query('PENDING'), { ...context, canApprove: false }),
    ).resolves.toEqual({ total: 0, items: [] });
    await expect(repository.count('COMPLETED', { ...context, canApprove: false })).resolves.toBe(2);
  });

  it('uses updatedAt and id as a stable document pagination key', async () => {
    const first = await repository.findPage(query('MINE', { pageSize: 1 }), {
      userId: 'user-applicant',
      allowedModules: ['CONTRACT'],
      canApprove: false,
      canFollow: true,
      moduleScopes: { CONTRACT: { all: false, self: true, departmentIds: [] } },
    });
    const second = await repository.findPage(query('MINE', { page: 2, pageSize: 1 }), {
      userId: 'user-applicant',
      allowedModules: ['CONTRACT'],
      canApprove: false,
      canFollow: true,
      moduleScopes: { CONTRACT: { all: false, self: true, departmentIds: [] } },
    });

    expect(first.total).toBe(2);
    expect(first.items.map((item) => item.documentId)).toEqual(['doc-contract-b']);
    expect(second.items.map((item) => item.documentId)).toEqual(['doc-contract-a']);
  });

  it('combines title/name, type, applicant, department, status and date filters', async () => {
    const result = await repository.findPage(
      query('MINE', {
        keyword: '业务申请人',
        documentType: 'CONTRACT_REQUEST',
        applicantId: 'user-applicant',
        departmentId: 'dept-business',
        status: 'DRAFT',
        dateFrom: new Date('2026-07-01T00:00:00.000Z'),
        dateTo: new Date('2026-07-31T23:59:59.999Z'),
      }),
      applicantContext(),
    );

    expect(result.items.map((item) => item.documentId)).toEqual(['doc-contract-a']);
    await expect(repository.count('DRAFTS', applicantContext())).resolves.toBe(1);
  });

  it('returns persistent following and copied facts without leaking a revoked data scope', async () => {
    const following = await repository.findPage(query('FOLLOWING'), context);
    const copied = await repository.findPage(query('COPIED'), context);

    expect(following.total).toBe(2);
    expect(following.items.map((item) => item.documentId).sort()).toEqual([
      'doc-contract-b',
      'doc-contract-completed',
    ]);
    expect(following.items.every((item) => item.followedAt)).toBe(true);
    expect(copied.items).toEqual([
      expect.objectContaining({
        id: 'copy-contract-b',
        documentId: 'doc-contract-b',
        copyId: 'copy-contract-b',
        copySenderId: 'user-applicant',
        copySenderName: '业务申请人',
        copyReadAt: null,
      }),
    ]);
  });
});

function applicantContext(): WorkbenchRepositoryContext {
  return {
    userId: 'user-applicant',
    allowedModules: ['CONTRACT'],
    canApprove: false,
    canFollow: true,
    moduleScopes: { CONTRACT: { all: false, self: true, departmentIds: [] } },
  };
}

function query(box: WorkbenchBox, overrides: Partial<WorkbenchQuery> = {}): WorkbenchQuery {
  return {
    box,
    page: 1,
    pageSize: 20,
    keyword: null,
    documentType: null,
    applicantId: null,
    departmentId: null,
    status: null,
    dateFrom: null,
    dateTo: null,
    ...overrides,
  };
}

async function seedRows(moduleRef: TestingModule): Promise<void> {
  const departments = moduleRef.get<Repository<DepartmentEntity>>(
    getRepositoryToken(DepartmentEntity),
  );
  const users = moduleRef.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
  const documents = moduleRef.get<Repository<DocumentIndexEntity>>(
    getRepositoryToken(DocumentIndexEntity),
  );
  const tasks = moduleRef.get<Repository<WorkflowTaskEntity>>(
    getRepositoryToken(WorkflowTaskEntity),
  );
  const candidates = moduleRef.get<Repository<WorkflowTaskCandidateEntity>>(
    getRepositoryToken(WorkflowTaskCandidateEntity),
  );
  const follows = moduleRef.get<Repository<DocumentFollowEntity>>(
    getRepositoryToken(DocumentFollowEntity),
  );
  const copies = moduleRef.get<Repository<WorkflowCopyEntity>>(
    getRepositoryToken(WorkflowCopyEntity),
  );
  await departments.save([
    { id: 'dept-business', code: 'BUSINESS', name: '业务部', managerUserId: null },
    { id: 'dept-office', code: 'OFFICE', name: '办公室', managerUserId: null },
  ]);
  await users.save([
    userRow('user-applicant', '业务申请人', 'dept-business'),
    userRow('user-approver', '审批人', 'dept-office'),
    userRow('user-other', '其他审批人', 'dept-office'),
  ]);
  const sameTime = new Date('2026-07-10T08:00:00.000Z');
  await documents.save([
    documentRow('doc-contract-a', 'CONTRACT', 'DRAFT', '七月合同草稿', sameTime),
    documentRow('doc-contract-b', 'CONTRACT', 'IN_REVIEW', '七月合同请示', sameTime),
    documentRow('doc-contract-completed', 'CONTRACT', 'APPROVED', '已办合同', sameTime, {
      applicantId: 'user-other',
      departmentId: 'dept-office',
    }),
    documentRow('doc-contract-scope-hidden', 'CONTRACT', 'APPROVED', '范围外合同', sameTime, {
      applicantId: 'user-other',
      departmentId: 'dept-office',
    }),
    documentRow('doc-seal-hidden', 'SEAL', 'IN_REVIEW', '印章申请', sameTime, {
      documentType: 'SEAL_USE',
    }),
  ]);
  await tasks.save([
    taskRow('task-pending-contract', 'doc-contract-b', 'PENDING', null, sameTime),
    taskRow('task-pending-seal', 'doc-seal-hidden', 'PENDING', null, sameTime),
    taskRow(
      'task-completed-contract',
      'doc-contract-completed',
      'COMPLETED',
      'user-approver',
      sameTime,
    ),
    taskRow(
      'task-completed-contract-second',
      'doc-contract-completed',
      'COMPLETED',
      'user-approver',
      sameTime,
    ),
  ]);
  await candidates.save([
    candidateRow('candidate-contract', 'task-pending-contract', 'user-approver'),
    candidateRow('candidate-seal', 'task-pending-seal', 'user-approver'),
  ]);
  await follows.save([
    { documentId: 'doc-contract-b', userId: 'user-approver', createdAt: sameTime },
    { documentId: 'doc-contract-completed', userId: 'user-approver', createdAt: sameTime },
    { documentId: 'doc-contract-scope-hidden', userId: 'user-approver', createdAt: sameTime },
  ]);
  await copies.save({
    id: 'copy-contract-b',
    documentId: 'doc-contract-b',
    senderId: 'user-applicant',
    senderName: '业务申请人',
    recipientId: 'user-approver',
    recipientName: '审批人',
    readAt: null,
    createdAt: sameTime,
  });
}

function userRow(id: string, displayName: string, departmentId: string): UserEntity {
  return {
    id,
    username: id,
    displayName,
    passwordHash: 'not-used',
    departmentId,
    roleCodes: [],
    active: true,
  };
}

function documentRow(
  id: string,
  module: BusinessModule,
  status: string,
  title: string,
  updatedAt: Date,
  options: {
    documentType?: DocumentIndexEntity['documentType'];
    applicantId?: string;
    departmentId?: string;
  } = {},
): DocumentIndexEntity {
  return {
    id,
    documentType: options.documentType ?? 'CONTRACT_REQUEST',
    module,
    title,
    applicantId: options.applicantId ?? 'user-applicant',
    departmentId: options.departmentId ?? 'dept-business',
    status,
    documentNo: null,
    revision: 1,
    currentStep: status === 'IN_REVIEW' ? 0 : null,
    workflowCode: 'FLOW',
    processVersionId: null,
    formVersionId: null,
    createdAt: updatedAt,
    updatedAt,
  };
}

function taskRow(
  id: string,
  documentId: string,
  status: string,
  completedBy: string | null,
  updatedAt: Date,
): WorkflowTaskEntity {
  return {
    id,
    documentId,
    stepIndex: 0,
    processNodeId: 'manager-review',
    assigneeType: 'ROLE',
    assigneeValue: 'DEPARTMENT_MANAGER',
    assigneeRole: 'DEPARTMENT_MANAGER',
    status,
    completedBy,
    createdAt: updatedAt,
    updatedAt,
  };
}

function candidateRow(id: string, taskId: string, userId: string): WorkflowTaskCandidateEntity {
  return {
    id,
    taskId,
    userId,
    source: 'ROLE',
    roleCode: 'DEPARTMENT_MANAGER',
    departmentId: 'dept-business',
  };
}
