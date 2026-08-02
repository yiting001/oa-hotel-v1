import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { FormDesignService } from '../application/form-design.service';
import {
  FORM_DESIGN_REPOSITORY,
  type FormDesignRepository,
} from '../domain/form-design.repository';
import type { CreateFormDefinitionInput } from '../application/form-design.service';
import { BUILT_IN_FORM_TEMPLATES } from './business-form.templates';

@Injectable()
export class FormDesignSeeder implements OnApplicationBootstrap {
  constructor(
    @Inject(FormDesignService)
    private readonly service: FormDesignService,
    @Inject(FORM_DESIGN_REPOSITORY)
    private readonly repository: FormDesignRepository,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const template of BUILT_IN_FORM_TEMPLATES) {
      await this.ensureTemplate(template);
    }
  }

  private async ensureTemplate(template: CreateFormDefinitionInput): Promise<void> {
    const existing = await this.repository.findDefinitionByCode(template.code);
    if (!existing) {
      const definition = await this.service.create(template, 'system');
      await this.service.publishVersion(definition.versions[0].id, 'system');
      return;
    }

    const detail = await this.repository.findDefinitionDetail(existing.id);
    const published = detail?.versions.find((version) => version.status === 'PUBLISHED');
    if (
      published &&
      templateRevision(published.schemaJson) >= templateRevision(template.schemaJson)
    ) {
      return;
    }

    const draft = published
      ? await this.service.copyVersion(
          existing.id,
          { sourceVersionId: published.id, changeNote: template.changeNote },
          'system',
        )
      : detail?.versions.find((version) => version.status === 'DRAFT');
    if (!draft) {
      return;
    }
    await this.service.updateVersion(
      draft.id,
      {
        schemaJson: template.schemaJson,
        printSchemaJson: template.printSchemaJson,
        changeNote: template.changeNote,
      },
      'system',
    );
    await this.service.publishVersion(draft.id, 'system');
  }
}

function templateRevision(schema: Record<string, unknown>): number {
  return typeof schema.systemTemplateRevision === 'number' ? schema.systemTemplateRevision : 0;
}
