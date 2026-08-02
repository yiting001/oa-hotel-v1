import type {
  ApprovalOpinion,
  ApprovalTaskSummary,
  BusinessModule,
  DocumentSummary,
  DocumentType,
} from '@oa/contracts';
import type { DocumentIndexEntity } from '../infrastructure/document-index.entity';
import type { WorkflowOpinionEntity } from '../infrastructure/workflow-opinion.entity';
import type { WorkflowTaskEntity } from '../infrastructure/workflow-task.entity';

export function toApprovalOpinion(opinion: WorkflowOpinionEntity): ApprovalOpinion {
  return {
    id: opinion.id,
    action: opinion.action as ApprovalOpinion['action'],
    comment: opinion.comment,
    actorName: opinion.actorName,
    actorDepartmentName: opinion.actorDepartmentName,
    actorPositionName: opinion.actorPositionName,
    processNodeName: opinion.processNodeName,
    createdAt: opinion.createdAt.toISOString(),
  };
}

export function toDocumentSummary(document: DocumentIndexEntity): DocumentSummary {
  return {
    id: document.id,
    documentType: document.documentType as DocumentType,
    module: document.module as BusinessModule,
    title: document.title,
    applicantId: document.applicantId,
    departmentId: document.departmentId,
    status: document.status as DocumentSummary['status'],
    documentNo: document.documentNo ?? null,
    revision: document.revision,
    currentStep: document.currentStep,
    workflowCode: document.workflowCode,
    processVersionId: document.processVersionId,
    formVersionId: document.formVersionId,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export function toTaskSummary(
  task: WorkflowTaskEntity,
  document: DocumentIndexEntity,
  processNodeName: string | null,
): ApprovalTaskSummary {
  return {
    id: task.id,
    documentId: task.documentId,
    documentType: document.documentType as DocumentType,
    documentTitle: document.title,
    currentStep: task.stepIndex,
    processNodeId: task.processNodeId,
    processNodeName,
    assigneeRole: task.assigneeRole,
    status: task.status as ApprovalTaskSummary['status'],
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}
