export type DefinitionStatus = 'DRAFT' | 'PUBLISHED' | 'RETIRED';

export interface DefinitionBase<TVersion> {
  id: string;
  code: string;
  name: string;
  documentType: string | null;
  description: string | null;
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  versions: TVersion[];
}

export interface VersionBase {
  id: string;
  definitionId: string;
  version: number;
  status: DefinitionStatus;
  changeNote: string | null;
  createdBy: string;
  updatedBy: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ProcessNodeType = 'START' | 'USER_TASK' | 'END';
export type AssigneeRule =
  | { type: 'APPLICANT_DEPARTMENT_MANAGER' }
  | { type: 'ROLE'; roleCode: string }
  | { type: 'USER'; userId: string };

export interface ProcessNodeModel {
  id: string;
  type: ProcessNodeType;
  name: string;
  assigneeRule?: AssigneeRule;
  position: { x: number; y: number };
  config?: Record<string, unknown>;
}

export interface ProcessEdgeModel {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface ProcessDesign {
  schemaVersion: 1;
  nodes: ProcessNodeModel[];
  edges: ProcessEdgeModel[];
  settings: Record<string, unknown>;
}

export interface ProcessVersion extends VersionBase {
  designJson: ProcessDesign;
}

export type ProcessDefinition = DefinitionBase<ProcessVersion>;

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'table'
  | 'attachment'
  | 'opinions';

export interface FormTableColumn {
  id: string;
  key: string;
  label: string;
  width: number;
}

export interface FormFieldModel {
  id: string;
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder: string;
  span: 1 | 2;
  sourceType: string;
  options?: string[];
  columns?: FormTableColumn[];
  extensions?: Record<string, unknown>;
}

export interface FormSchema {
  schemaVersion: number;
  layout: string;
  title: string;
  subtitle: string;
  columns: 2;
  fields: FormFieldModel[];
  extensions?: Record<string, unknown>;
}

export interface PrintSchema extends Record<string, unknown> {
  schemaVersion: 1;
  editorMode?: 'FIELD_GRID';
  paper: {
    size: 'A4';
    orientation: 'PORTRAIT';
    widthMm: 210;
    heightMm: 297;
    marginMm: { top: number; right: number; bottom: number; left: number };
  };
  typography?: Record<string, unknown>;
  sections: Array<Record<string, unknown> & { type: string }>;
  options: {
    showDocumentNumber: boolean;
    showApprovalOpinions: boolean;
    gridLineWidth: number;
  };
}

export interface FormVersion extends VersionBase {
  schemaJson: Record<string, unknown>;
  printSchemaJson: Partial<PrintSchema>;
}

export type FormDefinition = DefinitionBase<FormVersion>;

export interface DefinitionCreateInput<TSchema> extends Record<string, unknown> {
  code: string;
  name: string;
  description?: string;
  changeNote?: string;
  schema: TSchema;
}
