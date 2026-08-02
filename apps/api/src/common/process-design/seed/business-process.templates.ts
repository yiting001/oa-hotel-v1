import { WORKFLOW_ROLE_LABELS, type DocumentType } from '@oa/contracts';
import type { CreateProcessDefinitionInput } from '../application/process-design.service';
import type { PublishedAssigneeRule } from '../domain/process-design.types';
import {
  BUSINESS_WORKFLOW_CATALOG,
  type BusinessWorkflowDefinition,
} from '../../workflow/domain/business-workflow.catalog';

export type BuiltInProcessTemplate = CreateProcessDefinitionInput & {
  documentType: DocumentType;
};

/** Generates visual process designs from the same approval catalog used by the legacy runtime. */
export const BUILT_IN_PROCESS_TEMPLATES: readonly BuiltInProcessTemplate[] =
  BUSINESS_WORKFLOW_CATALOG.map(createBusinessProcessTemplate);

export const CONTRACT_EXPENSE_PROCESS_TEMPLATE = requiredTemplate('CONTRACT_REQUEST');

export function createBusinessProcessTemplate(
  definition: BusinessWorkflowDefinition,
): BuiltInProcessTemplate {
  const taskNodes = definition.approvalRoles.map((roleCode, index) => ({
    id: taskNodeId(roleCode, index),
    type: 'USER_TASK',
    name: taskNodeName(roleCode),
    position: { x: 320 + index * 240, y: 180 },
    assigneeRule: assigneeRule(roleCode),
  }));
  const endId = 'end';
  const orderedNodeIds = ['start', ...taskNodes.map((node) => node.id), endId];

  return {
    code: definition.processCode,
    name: `${definition.name}流程`,
    description: `申请人提交后依次由${definition.approvalRoles
      .map(approverDescription)
      .join('、')}办理。`,
    documentType: definition.documentType,
    changeNote: `系统预置${definition.name}流程`,
    designJson: {
      schemaVersion: 1,
      nodes: [
        { id: 'start', type: 'START', name: '发起', position: { x: 80, y: 180 } },
        ...taskNodes,
        {
          id: endId,
          type: 'END',
          name: '结束',
          position: { x: 320 + taskNodes.length * 240, y: 180 },
        },
      ],
      edges: orderedNodeIds.slice(0, -1).map((source, index) => {
        const target = orderedNodeIds[index + 1];
        return { id: `edge-${source}-${target}`, source, target };
      }),
      settings: {
        allowApplicantWithdraw: true,
        allowApproverReturn: true,
        opinionRequiredOnReturn: true,
      },
    },
  };
}

function requiredTemplate(documentType: DocumentType): BuiltInProcessTemplate {
  const template = BUILT_IN_PROCESS_TEMPLATES.find(
    (candidate) => candidate.documentType === documentType,
  );
  if (!template) throw new Error(`缺少内置流程模板: ${documentType}`);
  return template;
}

function taskNodeId(roleCode: string, index: number): string {
  const stableIds: Readonly<Record<string, string>> = {
    DEPARTMENT_MANAGER: 'department-manager',
    FINANCE_REVIEWER: 'finance-review',
    OFFICE_REVIEWER: 'office-review',
    SEAL_MANAGER: 'seal-manager',
    PROCUREMENT: 'procurement',
    WAREHOUSE_MANAGER: 'warehouse-manager',
  };
  return stableIds[roleCode] ?? `approval-${index + 1}`;
}

function taskNodeName(roleCode: string): string {
  return roleCode === 'DEPARTMENT_MANAGER'
    ? '部门负责人审批'
    : (WORKFLOW_ROLE_LABELS[roleCode] ?? '审批办理');
}

function approverDescription(roleCode: string): string {
  return roleCode === 'DEPARTMENT_MANAGER'
    ? '申请部门负责人'
    : (WORKFLOW_ROLE_LABELS[roleCode] ?? '审批人员');
}

function assigneeRule(roleCode: string): PublishedAssigneeRule {
  return roleCode === 'DEPARTMENT_MANAGER'
    ? { type: 'APPLICANT_DEPARTMENT_MANAGER' }
    : { type: 'ROLE', roleCode };
}
