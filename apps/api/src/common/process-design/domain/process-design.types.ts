export const PROCESS_VERSION_STATUSES = ['DRAFT', 'PUBLISHED', 'RETIRED'] as const;
export const PROCESS_NODE_TYPES = [
  'START',
  'USER_TASK',
  'END',
  'EXCLUSIVE_GATEWAY',
  'PARALLEL_GATEWAY',
  'COUNTERSIGN',
] as const;
export const ASSIGNEE_RULE_TYPES = ['APPLICANT_DEPARTMENT_MANAGER', 'ROLE', 'USER'] as const;

export type ProcessVersionStatus = (typeof PROCESS_VERSION_STATUSES)[number];
export type ProcessNodeType = (typeof PROCESS_NODE_TYPES)[number];
export type AssigneeRuleType = (typeof ASSIGNEE_RULE_TYPES)[number];

export interface ProcessDefinition {
  id: string;
  code: string;
  name: string;
  description: string | null;
  documentType: string | null;
  active: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessVersion {
  id: string;
  definitionId: string;
  version: number;
  status: ProcessVersionStatus;
  designJson: Record<string, unknown>;
  changeNote: string | null;
  createdBy: string;
  updatedBy: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessDefinitionDetail extends ProcessDefinition {
  versions: ProcessVersion[];
}

export interface PublishedProcessDesign {
  definition: ProcessDefinition;
  version: ProcessVersion;
}

export type PublishedAssigneeRule =
  | { type: 'APPLICANT_DEPARTMENT_MANAGER' }
  | { type: 'ROLE'; roleCode: string }
  | { type: 'USER'; userId: string };

export interface PublishedUserTask {
  id: string;
  name: string;
  assigneeRule: PublishedAssigneeRule;
}
