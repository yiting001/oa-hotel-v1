import { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parsePublishedUserTasks } from '../domain/process-design.rules';
import { ProcessDefinitionEntity } from '../infrastructure/process-definition.entity';
import { ProcessVersionEntity } from '../infrastructure/process-version.entity';
import { TypeOrmProcessDesignRepository } from '../infrastructure/typeorm-process-design.repository';
import { CONTRACT_EXPENSE_PROCESS_TEMPLATE } from '../seed/business-process.templates';
import { ProcessDesignService } from './process-design.service';

describe('ProcessDesignService', () => {
  let dataSource: DataSource;
  let service: ProcessDesignService;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [ProcessDefinitionEntity, ProcessVersionEntity],
      synchronize: true,
    });
    await dataSource.initialize();
    const repository = new TypeOrmProcessDesignRepository(
      dataSource.getRepository(ProcessDefinitionEntity),
      dataSource.getRepository(ProcessVersionEntity),
      dataSource,
    );
    service = new ProcessDesignService(repository);
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it('publishes a valid linear process, protects it, and creates a new draft copy', async () => {
    const definition = await service.create(CONTRACT_EXPENSE_PROCESS_TEMPLATE, 'designer-1');
    const published = await service.publishVersion(definition.versions[0].id, 'designer-1');
    const bound = await service.findPublishedByDocumentType('CONTRACT_REQUEST');
    expect(bound?.version.id).toBe(published.id);
    expect(await service.listPublishedSummaries()).toEqual([
      expect.objectContaining({
        documentType: 'CONTRACT_REQUEST',
        version: 1,
        approvalPath: ['部门负责人审批', '财务审核'],
      }),
    ]);
    expect(parsePublishedUserTasks(published.designJson)).toEqual([
      {
        id: 'department-manager',
        name: '部门负责人审批',
        assigneeRule: { type: 'APPLICANT_DEPARTMENT_MANAGER' },
      },
      {
        id: 'finance-review',
        name: '财务审核',
        assigneeRule: { type: 'ROLE', roleCode: 'FINANCE_REVIEWER' },
      },
    ]);

    await expect(
      service.updateVersion(published.id, { changeNote: '覆盖已发布流程' }, 'designer-1'),
    ).rejects.toMatchObject({ code: 'PROCESS_VERSION_IMMUTABLE' });

    const copied = await service.copyVersion(definition.id, {}, 'designer-2');
    expect(copied).toMatchObject({ version: 2, status: 'DRAFT', createdBy: 'designer-2' });
    expect(copied.designJson).toEqual(published.designJson);
  });

  it('rejects a branching process during publication', async () => {
    const invalidDesign = structuredClone(CONTRACT_EXPENSE_PROCESS_TEMPLATE.designJson) as {
      nodes: Record<string, unknown>[];
      edges: Record<string, unknown>[];
    };
    invalidDesign.edges.push({
      id: 'edge-manager-end',
      source: 'department-manager',
      target: 'end',
    });
    const definition = await service.create(
      {
        ...CONTRACT_EXPENSE_PROCESS_TEMPLATE,
        code: 'INVALID_BRANCHING_PROCESS',
        designJson: invalidDesign,
      },
      'designer-1',
    );

    await expect(
      service.publishVersion(definition.versions[0].id, 'designer-1'),
    ).rejects.toMatchObject({ code: 'PROCESS_DESIGN_INVALID' });
  });
});
