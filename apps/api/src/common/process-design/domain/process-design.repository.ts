import type {
  ProcessDefinition,
  ProcessDefinitionDetail,
  ProcessVersion,
  PublishedProcessDesign,
} from './process-design.types';

export const PROCESS_DESIGN_REPOSITORY = Symbol('PROCESS_DESIGN_REPOSITORY');

export interface CreateProcessDefinitionRecord {
  definition: Pick<
    ProcessDefinition,
    'id' | 'code' | 'name' | 'description' | 'documentType' | 'createdBy'
  >;
  version: Pick<
    ProcessVersion,
    | 'id'
    | 'definitionId'
    | 'version'
    | 'status'
    | 'designJson'
    | 'changeNote'
    | 'createdBy'
    | 'updatedBy'
  >;
}

export interface UpdateProcessVersionRecord {
  designJson: Record<string, unknown>;
  changeNote: string | null;
  updatedBy: string;
}

/** Persistence boundary for atomic process definition and version operations. */
export interface ProcessDesignRepository {
  listDefinitions(): Promise<ProcessDefinitionDetail[]>;
  findDefinition(id: string): Promise<ProcessDefinition | null>;
  findDefinitionByCode(code: string): Promise<ProcessDefinition | null>;
  findDefinitionByDocumentType(documentType: string): Promise<ProcessDefinition | null>;
  findDefinitionDetail(id: string): Promise<ProcessDefinitionDetail | null>;
  findPublishedByDocumentType(documentType: string): Promise<PublishedProcessDesign | null>;
  findVersion(id: string): Promise<ProcessVersion | null>;
  findLatestVersion(definitionId: string): Promise<ProcessVersion | null>;
  createDefinition(record: CreateProcessDefinitionRecord): Promise<void>;
  copyVersion(
    definitionId: string,
    source: ProcessVersion,
    changeNote: string,
    actorId: string,
  ): Promise<ProcessVersion>;
  updateDraftVersion(
    versionId: string,
    update: UpdateProcessVersionRecord,
  ): Promise<ProcessVersion | null>;
  publishDraftVersion(versionId: string, actorId: string): Promise<ProcessVersion | null>;
}
