import { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FormDefinitionEntity } from '../infrastructure/form-definition.entity';
import { FormVersionEntity } from '../infrastructure/form-version.entity';
import { TypeOrmFormDesignRepository } from '../infrastructure/typeorm-form-design.repository';
import { REQUEST_REPORT_TEMPLATE } from '../seed/request-report.template';
import { FormDesignService } from './form-design.service';

describe('FormDesignService', () => {
  let dataSource: DataSource;
  let service: FormDesignService;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [FormDefinitionEntity, FormVersionEntity],
      synchronize: true,
    });
    await dataSource.initialize();
    const repository = new TypeOrmFormDesignRepository(
      dataSource.getRepository(FormDefinitionEntity),
      dataSource.getRepository(FormVersionEntity),
      dataSource,
    );
    service = new FormDesignService(repository);
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it('keeps a published version immutable and copies it into the next draft', async () => {
    const definition = await service.create(REQUEST_REPORT_TEMPLATE, 'designer-1');
    const first = await service.publishVersion(definition.versions[0].id, 'designer-1');
    const bound = await service.findPublishedByDocumentType('CONTRACT_REQUEST');
    expect(bound?.version.id).toBe(first.id);

    await expect(
      service.updateVersion(first.id, { changeNote: '不允许覆盖已发布版本' }, 'designer-1'),
    ).rejects.toMatchObject({ code: 'FORM_VERSION_IMMUTABLE' });

    const copied = await service.copyVersion(definition.id, {}, 'designer-2');
    expect(copied).toMatchObject({ version: 2, status: 'DRAFT', createdBy: 'designer-2' });
    expect(copied.schemaJson).toEqual(first.schemaJson);
    expect(copied.printSchemaJson).toEqual(first.printSchemaJson);

    await service.publishVersion(copied.id, 'designer-2');
    const updated = await service.get(definition.id);
    expect(updated.versions).toEqual([
      expect.objectContaining({ version: 2, status: 'PUBLISHED' }),
      expect.objectContaining({ version: 1, status: 'RETIRED' }),
    ]);
  });
});
