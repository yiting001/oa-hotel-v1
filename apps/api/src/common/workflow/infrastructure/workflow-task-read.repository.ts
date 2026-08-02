import type { SessionUser } from '@oa/contracts';
import type { Repository } from 'typeorm';
import { allowedBusinessModules } from '../../auth/business-module-permission';
import { DocumentIndexEntity } from './document-index.entity';
import { WorkflowTaskCandidateEntity } from './workflow-task-candidate.entity';
import { WorkflowTaskEntity } from './workflow-task.entity';

export async function findPendingWorkflowTasks(
  repository: Repository<WorkflowTaskEntity>,
  user: SessionUser,
): Promise<WorkflowTaskEntity[]> {
  const allowedModules = allowedBusinessModules(user, 'VIEW');
  if (!user.permissionCodes.includes('WORKFLOW_APPROVE') || allowedModules.length === 0) return [];

  return repository
    .createQueryBuilder('task')
    .innerJoin(
      WorkflowTaskCandidateEntity,
      'candidate',
      'candidate.taskId = task.id AND candidate.userId = :userId',
      { userId: user.id },
    )
    .innerJoin(DocumentIndexEntity, 'document', 'document.id = task.documentId')
    .where('task.status = :status', { status: 'PENDING' })
    .andWhere('document.module IN (:...allowedModules)', { allowedModules })
    .orderBy('task.createdAt', 'DESC')
    .addOrderBy('task.id', 'DESC')
    .getMany();
}

export async function findCompletedWorkflowTasks(
  repository: Repository<WorkflowTaskEntity>,
  user: SessionUser,
): Promise<WorkflowTaskEntity[]> {
  const allowedModules = allowedBusinessModules(user, 'VIEW');
  if (allowedModules.length === 0) return [];

  return repository
    .createQueryBuilder('task')
    .innerJoin(DocumentIndexEntity, 'document', 'document.id = task.documentId')
    .where('task.completedBy = :userId', { userId: user.id })
    .andWhere('task.status = :status', { status: 'COMPLETED' })
    .andWhere('document.module IN (:...allowedModules)', { allowedModules })
    .orderBy('task.updatedAt', 'DESC')
    .addOrderBy('task.id', 'DESC')
    .take(100)
    .getMany();
}
