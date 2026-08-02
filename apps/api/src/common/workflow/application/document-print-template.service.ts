import { Inject, Injectable } from '@nestjs/common';
import type { DocumentPrintTemplate, SessionUser } from '@oa/contracts';
import { FormDesignService } from '../../form-design/application/form-design.service';
import { DocumentWorkflowService } from './document-workflow.service';

@Injectable()
export class DocumentPrintTemplateService {
  constructor(
    @Inject(DocumentWorkflowService)
    private readonly workflow: DocumentWorkflowService,
    @Inject(FormDesignService)
    private readonly forms: FormDesignService,
  ) {}

  async get(documentId: string, user: SessionUser): Promise<DocumentPrintTemplate | null> {
    const document = await this.workflow.getViewableDocument(documentId, user);
    if (!document.formVersionId) {
      return null;
    }

    const version = await this.forms.getVersion(document.formVersionId);
    const definition = await this.forms.get(version.definitionId);
    return {
      formVersionId: version.id,
      definitionCode: definition.code,
      definitionName: definition.name,
      version: version.version,
      schemaJson: version.schemaJson,
      printSchemaJson: version.printSchemaJson,
    };
  }
}
