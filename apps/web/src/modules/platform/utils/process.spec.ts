import { describe, expect, it } from 'vitest';
import { reactive } from 'vue';
import {
  cloneProcessDesign,
  createDefaultProcessDesign,
  createProcessNode,
  validateProcessDesign,
} from './process';

describe('process designer validation', () => {
  it('accepts a complete linear approval chain', () => {
    expect(validateProcessDesign(createDefaultProcessDesign())).toEqual([]);
  });

  it('rejects branches before a version is published', () => {
    const design = createDefaultProcessDesign();
    const extraTask = createProcessNode('USER_TASK', 340, 320);
    const start = design.nodes.find((node) => node.type === 'START');
    const end = design.nodes.find((node) => node.type === 'END');
    design.nodes.push(extraTask);
    design.edges.push({
      id: crypto.randomUUID(),
      source: start?.id ?? '',
      target: extraTask.id,
    });
    design.edges.push({
      id: crypto.randomUUID(),
      source: extraTask.id,
      target: end?.id ?? '',
    });

    expect(validateProcessDesign(design)).toContain('当前版本仅支持从开始到结束的单链审批流程');
  });

  it('clones a design after Vue has made the API response reactive', () => {
    const design = reactive(createDefaultProcessDesign());

    expect(cloneProcessDesign(design)).toEqual(design);
  });
});
