import { describe, expect, it } from 'vitest';
import type { WorkflowDefinitionEntity } from '../infrastructure/workflow-definition.entity';
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
