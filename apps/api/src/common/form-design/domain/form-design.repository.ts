import type {
  FormDefinition,
  FormDefinitionDetail,
  FormVersion,
  PublishedFormDesign,
} from './form-design.types';

export const FORM_DESIGN_REPOSITORY = Symbol('FORM_DESIGN_REPOSITORY');

export interface CreateFormDefinitionRecord {
  definition: Pick<
    FormDefinition,
    'id' | 'code' | 'name' | 'description' | 'documentType' | 'createdBy'
  >;
  version: Pick<
    FormVersion,
    | 'id'
    | 'definitionId'
    | 'version'
    | 'status'
    | 'schemaJson'
    | 'printSchemaJson'
    | 'changeNote'
    | 'createdBy'
    | 'updatedBy'
  >;
}

export interface UpdateFormVersionRecord {
  schemaJson: Record<string, unknown>;
  printSchemaJson: Record<string, unknown>;
  changeNote: string | null;
  updatedBy: string;
}

/** Persistence boundary for atomic definition and version lifecycle operations. */
export interface FormDesignRepository {
  listDefinitions(): Promise<FormDefinitionDetail[]>;
  findDefinition(id: string): Promise<FormDefinition | null>;
  findDefinitionByCode(code: string): Promise<FormDefinition | null>;
  findDefinitionByDocumentType(documentType: string): Promise<FormDefinition | null>;
  findDefinitionDetail(id: string): Promise<FormDefinitionDetail | null>;
  findPublishedByDocumentType(documentType: string): Promise<PublishedFormDesign | null>;
  findVersion(id: string): Promise<FormVersion | null>;
  findLatestVersion(definitionId: string): Promise<FormVersion | null>;
  createDefinition(record: CreateFormDefinitionRecord): Promise<void>;
  copyVersion(
    definitionId: string,
    source: FormVersion,
    changeNote: string,
    actorId: string,
  ): Promise<FormVersion>;
  updateDraftVersion(
    versionId: string,
    update: UpdateFormVersionRecord,
  ): Promise<FormVersion | null>;
  publishDraftVersion(versionId: string, actorId: string): Promise<FormVersion | null>;
}
