export const FORM_VERSION_STATUSES = ['DRAFT', 'PUBLISHED', 'RETIRED'] as const;

export type FormVersionStatus = (typeof FORM_VERSION_STATUSES)[number];

export interface FormDefinition {
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

export interface FormVersion {
  id: string;
  definitionId: string;
  version: number;
  status: FormVersionStatus;
  schemaJson: Record<string, unknown>;
  printSchemaJson: Record<string, unknown>;
  changeNote: string | null;
  createdBy: string;
  updatedBy: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormDefinitionDetail extends FormDefinition {
  versions: FormVersion[];
}

export interface PublishedFormDesign {
  definition: FormDefinition;
  version: FormVersion;
}
