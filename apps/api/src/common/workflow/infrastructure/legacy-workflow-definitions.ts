import type { WorkflowDefinitionEntity } from './workflow-definition.entity';
import { BUSINESS_WORKFLOW_CATALOG } from '../domain/business-workflow.catalog';

/** Compatibility definitions retained for documents created before visual processes were available. */
export const LEGACY_WORKFLOW_DEFINITIONS: WorkflowDefinitionEntity[] =
  BUSINESS_WORKFLOW_CATALOG.map((definition) => ({
    code: definition.legacyCode,
    documentType: definition.documentType,
    name: definition.name,
    steps: [...definition.approvalRoles],
    version: 1,
    active: true,
  }));
