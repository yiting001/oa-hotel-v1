import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ProcessDesignService } from '../application/process-design.service';
import {
  PROCESS_DESIGN_REPOSITORY,
  type ProcessDesignRepository,
} from '../domain/process-design.repository';
import {
  BUILT_IN_PROCESS_TEMPLATES,
  type BuiltInProcessTemplate,
} from './business-process.templates';

@Injectable()
export class ProcessDesignSeeder implements OnApplicationBootstrap {
  constructor(
    @Inject(ProcessDesignService)
    private readonly service: ProcessDesignService,
    @Inject(PROCESS_DESIGN_REPOSITORY)
    private readonly repository: ProcessDesignRepository,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const template of BUILT_IN_PROCESS_TEMPLATES) {
      await this.ensureTemplate(template);
    }
  }

  private async ensureTemplate(template: BuiltInProcessTemplate): Promise<void> {
    const existing =
      (await this.repository.findDefinitionByCode(template.code)) ??
      (await this.repository.findDefinitionByDocumentType(template.documentType));
    if (existing) {
      const detail = await this.repository.findDefinitionDetail(existing.id);
      if (detail?.versions.some((version) => version.status === 'PUBLISHED')) {
        return;
      }
      const draft = detail?.versions.find((version) => version.status === 'DRAFT');
      if (draft) {
        await this.service.publishVersion(draft.id, 'system');
      }
      return;
    }
    const definition = await this.service.create(template, 'system');
    await this.service.publishVersion(definition.versions[0].id, 'system');
  }
}
