import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import type { Repository } from 'typeorm';
import { UserEntity } from '../../auth/user.entity';
import type { CandidateUser } from '../../iam/application/iam.models';
import { IamService } from '../../iam/application/iam.service';
import type { PublishedAssigneeRule } from '../../process-design/domain/process-design.types';
import { WorkflowTaskCandidateEntity } from '../infrastructure/workflow-task-candidate.entity';

const approvalPermissionCode = 'WORKFLOW_APPROVE';

export interface ApprovalCandidateResolution {
  candidates: CandidateUser[];
  resolvedCount: number;
}

/** Resolves assignee rules and removes users who cannot execute the resulting approval task. */
@Injectable()
export class WorkflowCandidateService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @Inject(IamService)
    private readonly iam: IamService,
  ) {}

  async resolve(
    rule: PublishedAssigneeRule,
    departmentId: string,
    ownerUserId: string,
    additionalPermissionCodes: string[] = [],
  ): Promise<ApprovalCandidateResolution> {
    const resolved = await this.resolveRule(rule, departmentId);
    const nonSelfCandidates = resolved.filter((candidate) => candidate.id !== ownerUserId);
    const eligible = await this.iam.filterCandidateUsersByPermissions(
      nonSelfCandidates,
      [...new Set([approvalPermissionCode, ...additionalPermissionCodes])],
      departmentId,
      ownerUserId,
    );
    return {
      resolvedCount: nonSelfCandidates.length,
      candidates: eligible,
    };
  }

  async insertSnapshot(
    repository: Repository<WorkflowTaskCandidateEntity>,
    taskId: string,
    rule: PublishedAssigneeRule,
    departmentId: string,
    candidates: CandidateUser[],
  ): Promise<void> {
    const roleCode = rule.type === 'ROLE' ? rule.roleCode : null;
    await repository
      .createQueryBuilder()
      .insert()
      .values(
        candidates.map((candidate) => ({
          id: randomUUID(),
          taskId,
          userId: candidate.id,
          source: rule.type,
          roleCode,
          departmentId: rule.type === 'USER' ? null : departmentId,
        })),
      )
      .orIgnore()
      .execute();
  }

  private async resolveRule(
    rule: PublishedAssigneeRule,
    departmentId: string,
  ): Promise<CandidateUser[]> {
    if (rule.type === 'USER') {
      const user = await this.users.findOneBy({ id: rule.userId, active: true });
      return user ? [{ id: user.id, username: user.username, displayName: user.displayName }] : [];
    }
    try {
      return rule.type === 'APPLICANT_DEPARTMENT_MANAGER'
        ? await this.iam.resolveApplicantDepartmentManagerUsers(departmentId)
        : await this.iam.resolveCandidateUsers(rule.roleCode, departmentId);
    } catch (error) {
      if (error instanceof NotFoundException) return [];
      throw error;
    }
  }
}
