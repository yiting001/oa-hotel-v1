import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WORKFLOW_ROLE_LABELS, isDocumentType } from '@oa/contracts';
import { Repository } from 'typeorm';
import { DomainError } from '../../errors/domain-error';
import { RoleEntity } from '../../iam/infrastructure/role.entity';
import { ProcessDesignService } from '../../process-design/application/process-design.service';
import { parsePublishedUserTasks } from '../../process-design/domain/process-design.rules';
import { createBusinessProcessTemplate } from '../../process-design/seed/business-process.templates';
import { WorkflowDefinitionEntity } from '../infrastructure/workflow-definition.entity';

export interface ApprovalChainSummary {
  code: string;
  documentType: string;
  name: string;
  steps: string[];
  stepLabels: string[];
  version: number;
  active: boolean;
}

/** 管理员的审批链路快捷配置：直接编排各单据类型的角色审批顺序。 */
@Injectable()
export class ApprovalChainService {
  constructor(
    @Inject(ProcessDesignService)
    private readonly processDesign: ProcessDesignService,
    @InjectRepository(WorkflowDefinitionEntity)
    private readonly legacyDefinitions: Repository<WorkflowDefinitionEntity>,
    @InjectRepository(RoleEntity)
    private readonly roles: Repository<RoleEntity>,
  ) {}

  async list(): Promise<ApprovalChainSummary[]> {
    const definitions = await this.processDesign.list();
    const summaries: ApprovalChainSummary[] = [];
    for (const definition of definitions) {
      const { documentType } = definition;
      if (!definition.active || !isDocumentType(documentType)) continue;
      const published = definition.versions.find((version) => version.status === 'PUBLISHED');
      if (!published) continue;
      const steps = parsePublishedUserTasks(published.designJson).map((task) =>
        task.assigneeRule.type === 'ROLE' ? task.assigneeRule.roleCode : task.name,
      );
      summaries.push({
        code: definition.code,
        documentType,
        name: definition.name,
        steps,
        stepLabels: steps.map((step) => WORKFLOW_ROLE_LABELS[step] ?? step),
        version: published.version,
        active: definition.active,
      });
    }
    return summaries.sort((left, right) => left.code.localeCompare(right.code));
  }

  async update(
    documentType: string,
    steps: string[],
    actorId: string,
  ): Promise<ApprovalChainSummary> {
    if (!isDocumentType(documentType)) {
      throw new DomainError('DOCUMENT_TYPE_INVALID', '未知的单据类型');
    }
    const normalized = steps.map((step) => step.trim()).filter((step) => step.length > 0);
    if (normalized.length === 0) {
      throw new DomainError('APPROVAL_CHAIN_EMPTY', '审批链路至少需要一个审批角色');
    }
    const knownRoles = new Set(
      (await this.roles.findBy({ active: true })).map((role) => role.code),
    );
    const unknown = normalized.filter(
      (code) => !knownRoles.has(code) && code !== 'APPLICANT_DEPARTMENT_MANAGER',
    );
    if (unknown.length > 0) {
      throw new DomainError('APPROVAL_ROLE_UNKNOWN', `审批角色不存在: ${unknown.join(', ')}`);
    }
    const definitions = await this.processDesign.list();
    const definition = definitions.find(
      (candidate) => candidate.active && candidate.documentType === documentType,
    );
    if (!definition) {
      throw new DomainError('WORKFLOW_NOT_CONFIGURED', '该单据未配置审批流程');
    }
    const template = createBusinessProcessTemplate({
      legacyCode: definition.code.toLowerCase(),
      processCode: definition.code,
      documentType,
      name: definition.name.replace(/流程$/, ''),
      approvalRoles: normalized,
    });
    const draft = await this.processDesign.copyVersion(
      definition.id,
      { changeNote: '后台审批链路配置调整' },
      actorId,
    );
    await this.processDesign.updateVersion(draft.id, { designJson: template.designJson }, actorId);
    await this.processDesign.publishVersion(draft.id, actorId);
    await this.legacyDefinitions.update({ documentType }, { steps: normalized });
    const summaries = await this.list();
    const summary = summaries.find((candidate) => candidate.documentType === documentType);
    if (!summary) {
      throw new DomainError('WORKFLOW_NOT_CONFIGURED', '审批链路发布失败');
    }
    return summary;
  }
}
