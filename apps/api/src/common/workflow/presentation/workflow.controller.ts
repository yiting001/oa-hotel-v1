import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../auth/current-user.decorator';
import { RequirePermissions } from '../../auth/required-permissions.decorator';
import { DocumentWorkflowService } from '../application/document-workflow.service';
import { CompleteTaskDto, SubmitDocumentDto } from './workflow-command.dto';

@Controller('workflow')
export class WorkflowController {
  constructor(
    @Inject(DocumentWorkflowService) private readonly workflow: DocumentWorkflowService,
  ) {}

  @Get('tasks')
  tasks(@CurrentUser() user: SessionUser) {
    return this.workflow.listTasks(user);
  }

  @Get('my-documents')
  myDocuments(@CurrentUser() user: SessionUser) {
    return this.workflow.listMyDocuments(user);
  }

  @Get('documents/:id/history')
  history(@Param('id') documentId: string, @CurrentUser() user: SessionUser) {
    return this.workflow.history(documentId, user);
  }

  @Post('documents/:id/submit')
  @RequirePermissions('DOCUMENT_CREATE')
  submit(
    @Param('id') documentId: string,
    @Body() dto: SubmitDocumentDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.workflow.submit(documentId, dto.requestId, user);
  }

  @Post('tasks/:id/approve')
  @RequirePermissions('WORKFLOW_APPROVE')
  approve(
    @Param('id') taskId: string,
    @Body() dto: CompleteTaskDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.workflow.completeTask(taskId, dto.requestId, dto.comment, 'APPROVE', user);
  }

  @Post('tasks/:id/return')
  @RequirePermissions('WORKFLOW_APPROVE')
  returnTask(
    @Param('id') taskId: string,
    @Body() dto: CompleteTaskDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.workflow.completeTask(taskId, dto.requestId, dto.comment, 'RETURN', user);
  }
}
