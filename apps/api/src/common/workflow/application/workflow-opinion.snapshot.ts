import type { SessionUser } from '@oa/contracts';
import { randomUUID } from 'node:crypto';
import type { WorkflowOpinionEntity } from '../infrastructure/workflow-opinion.entity';
import type { RuntimeWorkflowTask } from './workflow-runtime-definition';

interface OpinionSnapshotInput {
  documentId: string;
  taskId: string;
  actor: SessionUser;
  action: 'SUBMIT' | 'APPROVE' | 'RETURN';
  comment: string;
  node: RuntimeWorkflowTask | null | undefined;
}

/** Captures audit labels at decision time so later organization edits do not rewrite history. */
export function buildOpinionSnapshot(
  input: OpinionSnapshotInput,
): Omit<WorkflowOpinionEntity, 'createdAt'> {
  const membership =
    input.actor.memberships.find((item) => item.isPrimary) ?? input.actor.memberships[0];
  return {
    id: randomUUID(),
    documentId: input.documentId,
    taskId: input.taskId,
    actorId: input.actor.id,
    actorName: input.actor.displayName,
    actorDepartmentId: membership?.departmentId ?? input.actor.departmentId,
    actorDepartmentName: membership?.departmentName ?? input.actor.departmentName,
    actorPositionId: membership?.positionId ?? null,
    actorPositionName: membership?.positionName ?? null,
    processNodeId: input.node?.id ?? null,
    processNodeName: input.node?.name ?? (input.action === 'SUBMIT' ? '发起' : null),
    action: input.action,
    comment: input.comment,
  };
}
