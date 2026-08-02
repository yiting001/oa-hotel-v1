import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { BatchApprovalItemResult, BatchApprovalResult, SessionUser } from '@oa/contracts';
import { createHash } from 'node:crypto';
import { Repository } from 'typeorm';
import { DomainError } from '../../errors/domain-error';
import { WorkflowBatchCommandEntity } from '../infrastructure/workflow-batch-command.entity';
import { WorkflowTaskEntity } from '../infrastructure/workflow-task.entity';
import { DocumentWorkflowService } from './document-workflow.service';
import { stableWorkflowRequestId } from './workflow-request-id';

interface BatchApprovalInput {
  requestId: string;
  taskIds: string[];
  comment: string;
}

@Injectable()
export class WorkflowBatchApprovalService {
  constructor(
    @InjectRepository(WorkflowBatchCommandEntity)
    private readonly commands: Repository<WorkflowBatchCommandEntity>,
    @InjectRepository(WorkflowTaskEntity)
    private readonly tasks: Repository<WorkflowTaskEntity>,
    @Inject(DocumentWorkflowService)
    private readonly workflow: DocumentWorkflowService,
  ) {}

  async approve(input: BatchApprovalInput, user: SessionUser): Promise<BatchApprovalResult> {
    this.assertCanBatchApprove(user);
    const payloadHash = this.payloadHash(input);
    const existing = await this.commands.findOneBy({ requestId: input.requestId });
    if (existing) return this.restore(existing, user.id, payloadHash);

    const results: BatchApprovalItemResult[] = [];
    for (const taskId of input.taskIds) {
      results.push(await this.approveOne(taskId, input, user));
    }
    const result: BatchApprovalResult = {
      requestId: input.requestId,
      total: results.length,
      succeeded: results.filter((item) => item.status === 'SUCCEEDED').length,
      failed: results.filter((item) => item.status === 'FAILED').length,
      results,
    };
    try {
      await this.commands.save({
        requestId: input.requestId,
        actorId: user.id,
        payloadHash,
        resultJson: result as unknown as Record<string, unknown>,
      });
      return result;
    } catch (error) {
      const concurrent = await this.commands.findOneBy({ requestId: input.requestId });
      if (concurrent) return this.restore(concurrent, user.id, payloadHash);
      throw error;
    }
  }

  private async approveOne(
    taskId: string,
    input: BatchApprovalInput,
    user: SessionUser,
  ): Promise<BatchApprovalItemResult> {
    const task = await this.tasks.findOneBy({ id: taskId });
    try {
      const document = await this.workflow.completeTask(
        taskId,
        stableWorkflowRequestId(`batch:${input.requestId}:${taskId}`),
        input.comment,
        'APPROVE',
        user,
      );
      return {
        taskId,
        documentId: document.id,
        status: 'SUCCEEDED',
        code: null,
        message: '审批成功',
      };
    } catch (error) {
      const normalized = normalizeBatchError(error);
      return {
        taskId,
        documentId: task?.documentId ?? null,
        status: 'FAILED',
        ...normalized,
      };
    }
  }

  private restore(
    command: WorkflowBatchCommandEntity,
    actorId: string,
    payloadHash: string,
  ): BatchApprovalResult {
    if (command.actorId !== actorId || command.payloadHash !== payloadHash) {
      throw new ConflictException({
        code: 'WORKFLOW_BATCH_REQUEST_CONFLICT',
        message: 'requestId 已用于另一批审批请求',
      });
    }
    return command.resultJson as unknown as BatchApprovalResult;
  }

  private payloadHash(input: BatchApprovalInput): string {
    return createHash('sha256')
      .update(JSON.stringify({ taskIds: input.taskIds, comment: input.comment }))
      .digest('hex');
  }

  private assertCanBatchApprove(user: SessionUser): void {
    const permissions = new Set(user.permissionCodes);
    if (permissions.has('WORKFLOW_APPROVE') && permissions.has('WORKFLOW_BATCH_APPROVE')) return;
    throw new ForbiddenException('当前账号没有批量审批权限');
  }
}

function normalizeBatchError(error: unknown): Pick<BatchApprovalItemResult, 'code' | 'message'> {
  if (error instanceof DomainError) return { code: error.code, message: error.message };
  if (error instanceof HttpException) {
    const response = error.getResponse();
    if (typeof response === 'string')
      return { code: `HTTP_${error.getStatus()}`, message: response };
    const body = response as Record<string, unknown>;
    return {
      code: typeof body.code === 'string' ? body.code : `HTTP_${error.getStatus()}`,
      message: typeof body.message === 'string' ? body.message : error.message,
    };
  }
  return { code: 'INTERNAL_SERVER_ERROR', message: '任务处理失败' };
}
