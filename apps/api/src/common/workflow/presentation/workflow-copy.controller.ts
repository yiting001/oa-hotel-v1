import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../auth/current-user.decorator';
import { RequirePermissions } from '../../auth/required-permissions.decorator';
import { WorkflowCopyService } from '../application/workflow-copy.service';
import { CopyWorkflowDocumentDto } from './workflow-collaboration.dto';

@Controller('workflow')
export class WorkflowCopyController {
  constructor(@Inject(WorkflowCopyService) private readonly copies: WorkflowCopyService) {}

  @Get('documents/:documentId/copy-recipients')
  @RequirePermissions('WORKFLOW_COPY')
  listEligibleRecipients(
    @Param('documentId') documentId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.copies.listEligibleRecipients(documentId, user);
  }

  @Post('documents/:documentId/copies')
  @RequirePermissions('WORKFLOW_COPY')
  copyDocument(
    @Param('documentId') documentId: string,
    @Body() dto: CopyWorkflowDocumentDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.copies.copyDocument(documentId, dto.recipientIds, user);
  }

  @Post('copies/:copyId/read')
  @RequirePermissions('DOCUMENT_VIEW')
  markRead(@Param('copyId') copyId: string, @CurrentUser() user: SessionUser) {
    return this.copies.markRead(copyId, user);
  }
}
