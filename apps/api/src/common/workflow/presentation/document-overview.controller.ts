import { Controller, Get, Inject, Param } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../auth/current-user.decorator';
import { DocumentPrintTemplateService } from '../application/document-print-template.service';
import { DocumentWorkflowService } from '../application/document-workflow.service';

@Controller('workflow/documents')
export class DocumentOverviewController {
  constructor(
    @Inject(DocumentWorkflowService) private readonly workflow: DocumentWorkflowService,
    @Inject(DocumentPrintTemplateService)
    private readonly printTemplates: DocumentPrintTemplateService,
  ) {}

  @Get(':id/overview')
  get(@Param('id') documentId: string, @CurrentUser() user: SessionUser) {
    return this.workflow.overview(documentId, user);
  }

  @Get(':id/print-template')
  getPrintTemplate(@Param('id') documentId: string, @CurrentUser() user: SessionUser) {
    return this.printTemplates.get(documentId, user);
  }
}
