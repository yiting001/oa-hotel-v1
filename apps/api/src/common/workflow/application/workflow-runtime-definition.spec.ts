import { describe, expect, it } from 'vitest';
import { parsePublishedUserTasks } from '../../process-design/domain/process-design.rules';
import { createBusinessProcessTemplate } from '../../process-design/seed/business-process.templates';
import type { WorkflowDefinitionEntity } from '../infrastructure/workflow-definition.entity';
import { BUSINESS_WORKFLOW_CATALOG } from '../domain/business-workflow.catalog';
import { legacyRuntimeDefinition } from './workflow-runtime-definition';

describe('legacyRuntimeDefinition', () => {
  it('maps legacy role codes to enterprise-facing Chinese node names', () => {
    const definition = {
      code: 'legacy-display-test',
      documentType: 'CONTRACT_APPROVAL',
      name: '旧流程展示测试',
      steps: ['DEPARTMENT_MANAGER', 'OFFICE_REVIEWER', 'UNKNOWN_LEGACY_ROLE'],
      version: 1,
      active: true,
    } as WorkflowDefinitionEntity;

    expect(legacyRuntimeDefinition(definition).tasks.map((task) => task.name)).toEqual([
      '部门总监',
      '办公室审核',
      '审批办理',
    ]);
  });
});

describe('business process templates', () => {
  it('routes requests through the office department choice before the executive leader', () => {
    const definition = BUSINESS_WORKFLOW_CATALOG.find(
      (candidate) => candidate.documentType === 'CONTRACT_REQUEST',
    )!;
    const tasks = parsePublishedUserTasks(
      createBusinessProcessTemplate(definition).designJson,
    );

    expect(tasks.map((task) => task.kind)).toEqual(['APPROVAL', 'CHOICE', 'APPROVAL']);
    expect(tasks[1].advanceAfterBranches).toBe(true);
    expect(tasks[1].options.map((option) => option.name)).toContain('人力资源部审核');
    expect(tasks[1].options.map((option) => option.name)).not.toContain('外部律师审核');
  });

  it('keeps contract approval returning to the chooser after branch review', () => {
    const definition = BUSINESS_WORKFLOW_CATALOG.find(
      (candidate) => candidate.documentType === 'CONTRACT_APPROVAL',
    )!;
    const tasks = parsePublishedUserTasks(
      createBusinessProcessTemplate(definition).designJson,
    );

    expect(tasks[1].kind).toBe('CHOICE');
    expect(tasks[1].advanceAfterBranches).toBeUndefined();
  });
});
