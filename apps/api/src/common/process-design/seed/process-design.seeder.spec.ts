import { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parsePublishedUserTasks } from '../domain/process-design.rules';
import { ProcessDefinitionEntity } from '../infrastructure/process-definition.entity';
import { ProcessVersionEntity } from '../infrastructure/process-version.entity';
import { TypeOrmProcessDesignRepository } from '../infrastructure/typeorm-process-design.repository';
import { BUSINESS_WORKFLOW_CATALOG } from '../../workflow/domain/business-workflow.catalog';
import { ProcessDesignService } from '../application/process-design.service';
import { BUILT_IN_PROCESS_TEMPLATES } from './business-process.templates';
import { ProcessDesignSeeder } from './process-design.seeder';

describe('ProcessDesignSeeder', () => {
  let dataSource: DataSource;
  let repository: TypeOrmProcessDesignRepository;
  let seeder: ProcessDesignSeeder;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [ProcessDefinitionEntity, ProcessVersionEntity],
      synchronize: true,
    });
    await dataSource.initialize();
    repository = new TypeOrmProcessDesignRepository(
      dataSource.getRepository(ProcessDefinitionEntity),
      dataSource.getRepository(ProcessVersionEntity),
      dataSource,
    );
    seeder = new ProcessDesignSeeder(new ProcessDesignService(repository), repository);
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it('publishes all seven business workflows with legacy-compatible approval order', async () => {
    await seeder.onApplicationBootstrap();

    const definitions = await repository.listDefinitions();
    expect(definitions).toHaveLength(BUILT_IN_PROCESS_TEMPLATES.length);
    expect(BUILT_IN_PROCESS_TEMPLATES).toHaveLength(BUSINESS_WORKFLOW_CATALOG.length);

    for (const catalogItem of BUSINESS_WORKFLOW_CATALOG) {
      const published = await repository.findPublishedByDocumentType(catalogItem.documentType);
      expect(published?.definition.code).toBe(catalogItem.processCode);
      expect(normalizedRoles(published?.version.designJson)).toEqual(catalogItem.approvalRoles);
    }
  });

  it('does not create duplicate definitions or versions when rerun', async () => {
    await seeder.onApplicationBootstrap();
    await seeder.onApplicationBootstrap();

    const definitions = await repository.listDefinitions();
    expect(definitions).toHaveLength(BUSINESS_WORKFLOW_CATALOG.length);
    expect(definitions.every((definition) => definition.versions.length === 1)).toBe(true);
    expect(definitions.every((definition) => definition.versions[0]?.status === 'PUBLISHED')).toBe(
      true,
    );
  });
});

function normalizedRoles(designJson: Record<string, unknown> | undefined): string[] {
  if (!designJson) return [];
  return parsePublishedUserTasks(designJson).map((task) =>
    task.assigneeRule.type === 'APPLICANT_DEPARTMENT_MANAGER'
      ? 'DEPARTMENT_MANAGER'
      : task.assigneeRule.type === 'ROLE'
        ? task.assigneeRule.roleCode
        : `USER:${task.assigneeRule.userId}`,
  );
}
