import { Controller, Get, Inject } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../auth/current-user.decorator';
import { DocumentWorkflowService } from '../application/document-workflow.service';

@Controller('workflow/completed-tasks')
export class CompletedTasksController {
  constructor(
    @Inject(DocumentWorkflowService) private readonly workflow: DocumentWorkflowService,
  ) {}

  @Get()
  list(@CurrentUser() user: SessionUser) {
    return this.workflow.listCompletedTasks(user);
  }
}
