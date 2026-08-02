import { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FormDesignService } from '../application/form-design.service';
import { FormDefinitionEntity } from '../infrastructure/form-definition.entity';
import { FormVersionEntity } from '../infrastructure/form-version.entity';
import { TypeOrmFormDesignRepository } from '../infrastructure/typeorm-form-design.repository';
import { BUILT_IN_FORM_TEMPLATES } from './business-form.templates';
import { FormDesignSeeder } from './form-design.seeder';
import { REQUEST_REPORT_TEMPLATE } from './request-report.template';

describe('FormDesignSeeder', () => {
  let dataSource: DataSource;
  let repository: TypeOrmFormDesignRepository;
  let service: FormDesignService;
  let seeder: FormDesignSeeder;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [FormDefinitionEntity, FormVersionEntity],
      synchronize: true,
    });
    await dataSource.initialize();
    repository = new TypeOrmFormDesignRepository(
      dataSource.getRepository(FormDefinitionEntity),
      dataSource.getRepository(FormVersionEntity),
      dataSource,
    );
    service = new FormDesignService(repository);
    seeder = new FormDesignSeeder(service, repository);
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it('publishes one versioned A4 template for every implemented document type', async () => {
    await seeder.onApplicationBootstrap();
    const first = await repository.listDefinitions();

    expect(first).toHaveLength(BUILT_IN_FORM_TEMPLATES.length);
    expect(first.every((definition) => definition.versions[0]?.status === 'PUBLISHED')).toBe(true);
    expect(new Set(first.map((definition) => definition.documentType)).size).toBe(
      BUILT_IN_FORM_TEMPLATES.length,
    );

    await seeder.onApplicationBootstrap();
    const second = await repository.listDefinitions();
    expect(second.every((definition) => definition.versions.length === 1)).toBe(true);
  });

  it('upgrades an older built-in layout by publishing a new immutable version', async () => {
    const legacy = await service.create(
      {
        ...REQUEST_REPORT_TEMPLATE,
        schemaJson: { ...REQUEST_REPORT_TEMPLATE.schemaJson, systemTemplateRevision: 1 },
        printSchemaJson: { ...REQUEST_REPORT_TEMPLATE.printSchemaJson, systemTemplateRevision: 1 },
      },
      'system',
    );
    await service.publishVersion(legacy.versions[0].id, 'system');

    await seeder.onApplicationBootstrap();

    const upgraded = await repository.findDefinitionDetail(legacy.id);
    expect(upgraded?.versions).toEqual([
      expect.objectContaining({
        version: 2,
        status: 'PUBLISHED',
        schemaJson: expect.objectContaining({ systemTemplateRevision: 2 }),
      }),
      expect.objectContaining({ version: 1, status: 'RETIRED' }),
    ]);
  });
});
