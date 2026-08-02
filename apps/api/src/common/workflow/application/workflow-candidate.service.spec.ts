import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserEntity } from '../../auth/user.entity';
import type { CandidateUser } from '../../iam/application/iam.models';
import { IamService } from '../../iam/application/iam.service';
import type { PublishedAssigneeRule } from '../../process-design/domain/process-design.types';
import { WorkflowCandidateService } from './workflow-candidate.service';

describe('WorkflowCandidateService', () => {
  let users: {
    findOneBy: ReturnType<typeof vi.fn<Repository<UserEntity>['findOneBy']>>;
  };
  let iam: {
    resolveApplicantDepartmentManagerUsers: ReturnType<
      typeof vi.fn<IamService['resolveApplicantDepartmentManagerUsers']>
    >;
    resolveCandidateUsers: ReturnType<typeof vi.fn<IamService['resolveCandidateUsers']>>;
    filterCandidateUsersByPermissions: ReturnType<
      typeof vi.fn<IamService['filterCandidateUsersByPermissions']>
    >;
  };
  let service: WorkflowCandidateService;

  beforeEach(() => {
    users = { findOneBy: vi.fn<Repository<UserEntity>['findOneBy']>() };
    iam = {
      resolveApplicantDepartmentManagerUsers:
        vi.fn<IamService['resolveApplicantDepartmentManagerUsers']>(),
      resolveCandidateUsers: vi.fn<IamService['resolveCandidateUsers']>(),
      filterCandidateUsersByPermissions: vi.fn<IamService['filterCandidateUsersByPermissions']>(),
    };
    iam.filterCandidateUsersByPermissions.mockResolvedValue([]);
    service = new WorkflowCandidateService(
      users as unknown as Repository<UserEntity>,
      iam as unknown as IamService,
    );
  });

  it.each<{
    label: string;
    rule: PublishedAssigneeRule;
    arrange: () => void;
    candidate: CandidateUser;
  }>([
    {
      label: '角色',
      rule: { type: 'ROLE', roleCode: 'CUSTOM_REVIEWER' },
      candidate: candidate('role-user'),
      arrange: () => iam.resolveCandidateUsers.mockResolvedValue([candidate('role-user')]),
    },
    {
      label: '指定用户',
      rule: { type: 'USER', userId: 'direct-user' },
      candidate: candidate('direct-user'),
      arrange: () => users.findOneBy.mockResolvedValue(user('direct-user')),
    },
    {
      label: '申请人部门负责人',
      rule: { type: 'APPLICANT_DEPARTMENT_MANAGER' },
      candidate: candidate('manager-user'),
      arrange: () =>
        iam.resolveApplicantDepartmentManagerUsers.mockResolvedValue([candidate('manager-user')]),
    },
  ])('对$label规则应用审批权限过滤', async ({ rule, arrange, candidate: expected }) => {
    arrange();

    const resolution = await service.resolve(rule, 'dept-business', 'applicant-user');

    expect(resolution).toEqual({ resolvedCount: 1, candidates: [] });
    expect(iam.filterCandidateUsersByPermissions).toHaveBeenCalledWith(
      [expected],
      ['WORKFLOW_APPROVE'],
      'dept-business',
      'applicant-user',
    );
  });

  it('只保留拥有审批权限的候选人', async () => {
    const eligible = candidate('eligible-user');
    const denied = candidate('denied-user');
    iam.resolveCandidateUsers.mockResolvedValue([eligible, denied]);
    iam.filterCandidateUsersByPermissions.mockResolvedValue([eligible]);

    await expect(
      service.resolve(
        { type: 'ROLE', roleCode: 'MIXED_REVIEWER' },
        'dept-business',
        'applicant-user',
      ),
    ).resolves.toEqual({ resolvedCount: 2, candidates: [eligible] });
  });

  it('禁止申请人审批自己的单据，同时保留其他合格候选人', async () => {
    const applicant = candidate('applicant-manager');
    const proxy = candidate('proxy-manager');
    iam.resolveApplicantDepartmentManagerUsers.mockResolvedValue([applicant, proxy]);
    iam.filterCandidateUsersByPermissions.mockResolvedValue([proxy]);

    await expect(
      service.resolve({ type: 'APPLICANT_DEPARTMENT_MANAGER' }, 'dept-business', applicant.id),
    ).resolves.toEqual({ resolvedCount: 1, candidates: [proxy] });
    expect(iam.filterCandidateUsersByPermissions).toHaveBeenCalledWith(
      [proxy],
      ['WORKFLOW_APPROVE'],
      'dept-business',
      applicant.id,
    );
  });

  it('同时要求审批权限和业务模块查看权限', async () => {
    const eligible = candidate('eligible-user');
    iam.resolveCandidateUsers.mockResolvedValue([eligible]);
    iam.filterCandidateUsersByPermissions.mockResolvedValue([eligible]);

    await service.resolve(
      { type: 'ROLE', roleCode: 'REVIEWER' },
      'dept-business',
      'applicant-user',
      ['DOCUMENT_VIEW', 'CONTRACT_VIEW'],
    );

    expect(iam.filterCandidateUsersByPermissions).toHaveBeenCalledWith(
      [eligible],
      ['WORKFLOW_APPROVE', 'DOCUMENT_VIEW', 'CONTRACT_VIEW'],
      'dept-business',
      'applicant-user',
    );
  });
});

function candidate(id: string): CandidateUser {
  return { id, username: id, displayName: id };
}

function user(id: string): UserEntity {
  return {
    id,
    username: id,
    displayName: id,
    passwordHash: 'unused',
    departmentId: 'dept-business',
    roleCodes: [],
    active: true,
  };
}
