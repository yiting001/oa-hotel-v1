import { DomainError } from '../../errors/domain-error';
import { WORKFLOW_ROLE_LABELS } from '@oa/contracts';
import { parsePublishedUserTasks } from '../../process-design/domain/process-design.rules';
import type {
  ProcessDefinition,
  ProcessVersion,
  PublishedAssigneeRule,
} from '../../process-design/domain/process-design.types';
import type { WorkflowDefinitionEntity } from '../infrastructure/workflow-definition.entity';
import type { WorkflowTaskEntity } from '../infrastructure/workflow-task.entity';

export interface RuntimeWorkflowTask {
  id: string | null;
  name: string;
  assigneeRule: PublishedAssigneeRule;
}

export interface RuntimeWorkflowDefinition {
  code: string;
  name: string;
  version: number;
  processVersionId: string | null;
  tasks: RuntimeWorkflowTask[];
}

/** Converts an immutable process-design version into the workflow runtime model. */
export function publishedRuntimeDefinition(
  definition: ProcessDefinition,
  version: ProcessVersion,
): RuntimeWorkflowDefinition {
  if (!['PUBLISHED', 'RETIRED'].includes(version.status)) {
    throw new DomainError('WORKFLOW_VERSION_INVALID', '单据绑定的流程版本尚未发布');
  }
  return {
    code: definition.code,
    name: definition.name,
    version: version.version,
    processVersionId: version.id,
    tasks: parsePublishedUserTasks(version.designJson),
  };
}

/** Keeps documents created before the process designer executable. */
export function legacyRuntimeDefinition(
  definition: WorkflowDefinitionEntity,
): RuntimeWorkflowDefinition {
  return {
    code: definition.code,
    name: definition.name,
    version: definition.version,
    processVersionId: null,
    tasks: definition.steps.map((roleCode) => ({
      id: null,
      name: WORKFLOW_ROLE_LABELS[roleCode] ?? '审批办理',
      assigneeRule: { type: 'ROLE', roleCode },
    })),
  };
}

export function storedTaskAssigneeRule(task: WorkflowTaskEntity): PublishedAssigneeRule {
  if (task.assigneeType === 'APPLICANT_DEPARTMENT_MANAGER') {
    return { type: 'APPLICANT_DEPARTMENT_MANAGER' };
  }
  if (task.assigneeType === 'USER' && task.assigneeValue) {
    return { type: 'USER', userId: task.assigneeValue };
  }
  const roleCode = task.assigneeValue || task.assigneeRole;
  if (!roleCode) {
    throw new DomainError('WORKFLOW_ASSIGNEE_INVALID', '待办缺少办理人规则');
  }
  return { type: 'ROLE', roleCode };
}

export function taskAssigneeColumns(rule: PublishedAssigneeRule): {
  assigneeType: WorkflowTaskEntity['assigneeType'];
  assigneeValue: string | null;
  assigneeRole: string;
} {
  if (rule.type === 'APPLICANT_DEPARTMENT_MANAGER') {
    return {
      assigneeType: rule.type,
      assigneeValue: null,
      assigneeRole: 'APPLICANT_DEPARTMENT_MANAGER',
    };
  }
  if (rule.type === 'USER') {
    return {
      assigneeType: rule.type,
      assigneeValue: rule.userId,
      assigneeRole: 'DIRECT_USER',
    };
  }
  return {
    assigneeType: rule.type,
    assigneeValue: rule.roleCode,
    assigneeRole: rule.roleCode,
  };
}
