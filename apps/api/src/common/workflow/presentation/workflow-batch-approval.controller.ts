import { Body, Controller, Inject, Post } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../auth/current-user.decorator';
import { RequirePermissions } from '../../auth/required-permissions.decorator';
import { WorkflowBatchApprovalService } from '../application/workflow-batch-approval.service';
import { BatchApproveTasksDto } from './workflow-batch-approval.dto';

@Controller('workflow/tasks')
export class WorkflowBatchApprovalController {
  constructor(
    @Inject(WorkflowBatchApprovalService)
    private readonly batchApproval: WorkflowBatchApprovalService,
  ) {}

  @Post('batch-approve')
  @RequirePermissions('WORKFLOW_APPROVE', 'WORKFLOW_BATCH_APPROVE')
  approve(@Body() dto: BatchApproveTasksDto, @CurrentUser() user: SessionUser) {
    return this.batchApproval.approve(dto, user);
  }
}
