<script setup lang="ts">
import { ArrowRight } from '@element-plus/icons-vue';
import type { WorkflowOverview } from '@oa/contracts';
import { computed } from 'vue';
import { useLayoutMode } from '../../ui/useLayoutMode';
import { workflowNodeLabel } from '../document';

const props = defineProps<{ overview: WorkflowOverview; actionableTaskId?: string | null }>();
const emit = defineEmits<{ act: [taskId: string] }>();
const { isCompact } = useLayoutMode();

type State = 'done' | 'current' | 'pending' | 'returned' | 'draft';
const nodes = computed(() => {
  const status = props.overview.document.status;
  const current = props.overview.document.currentStep ?? 0;
  const start: { label: string; state: State; step: number | null } = {
    label: '发起',
    state: status === 'DRAFT' ? 'draft' : status === 'RETURNED' ? 'returned' : 'done',
    step: null,
  };
  const steps = props.overview.definition.steps.map((step, index) => ({
    label: workflowNodeLabel(step),
    state: (status === 'APPROVED' || (status === 'IN_REVIEW' && index < current)
      ? 'done'
      : status === 'IN_REVIEW' && index === current
        ? 'current'
        : 'pending') as State,
    step: index,
  }));
  return [
    start,
    ...steps,
    { label: '完成归档', state: (status === 'APPROVED' ? 'done' : 'pending') as State, step: null },
  ];
});

function act(state: State): void {
  if (state === 'current' && props.actionableTaskId) emit('act', props.actionableTaskId);
}
function stateLabel(state: State): string {
  return { done: '已完成', current: '办理中', pending: '待流转', returned: '已退回', draft: '草稿' }[state];
}
</script>

<template>
  <ol class="flow" :data-compact="isCompact" aria-label="审批流程">
    <li v-for="(node, index) in nodes" :key="index" class="flow__node" :data-state="node.state">
      <span class="flow__index">{{ index + 1 }}</span>
      <div class="flow__content">
        <strong>{{ node.label }}</strong>
        <span class="flow__state">{{ stateLabel(node.state) }}</span>
        <el-button
          v-if="node.state === 'current' && actionableTaskId"
          link
          type="primary"
          @click="act(node.state)"
          >进入审批</el-button
        >
      </div>
      <el-icon v-if="index < nodes.length - 1" class="flow__arrow" aria-hidden="true"><ArrowRight /></el-icon>
    </li>
  </ol>
</template>

<style scoped>
.flow {
  display: flex;
  width: 100%;
  margin: 0;
  padding: 0;
  align-items: stretch;
  gap: 0;
  overflow-x: auto;
  list-style: none;
}
.flow__node {
  display: flex;
  min-width: 0;
  flex: 1 0 132px;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 8px 12px 0;
  border-top: 2px solid var(--color-border);
}
.flow__node[data-state='done'] { border-top-color: var(--color-success); }
.flow__node[data-state='current'] { border-top-color: var(--color-primary); }
.flow__node[data-state='returned'] { border-top-color: var(--color-error); }
.flow__node[data-state='draft'] { border-top-color: var(--color-text-quaternary); }
.flow__index {
  display: grid;
  flex: 0 0 22px;
  height: 22px;
  place-items: center;
  color: var(--color-text-tertiary);
  background: var(--color-surface-3);
  border-radius: 50%;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.flow__node[data-state='done'] .flow__index { color: var(--color-success-text); background: var(--color-success-bg); }
.flow__node[data-state='current'] .flow__index { color: #fff; background: var(--color-primary); font-weight: 600; }
.flow__node[data-state='returned'] .flow__index { color: var(--color-error-text); background: var(--color-error-bg); }
.flow__content { display: grid; min-width: 0; gap: 4px; }
.flow__content strong { font-size: 13px; line-height: 1.4; overflow-wrap: anywhere; }
.flow__state { color: var(--color-text-tertiary); font-size: 12px; }
.flow__content :deep(.el-button) { justify-self: start; padding: 0; }
.flow__arrow { margin: 3px 0 0 auto; color: var(--color-text-quaternary); }
.flow[data-compact='true'] { display: grid; overflow: visible; }
.flow[data-compact='true'] .flow__node {
  min-width: 0;
  padding: 10px 0 10px 12px;
  border-top: 0;
  border-left: 2px solid var(--color-border);
}
.flow[data-compact='true'] .flow__node[data-state='done'] { border-left-color: var(--color-success); }
.flow[data-compact='true'] .flow__node[data-state='current'] { border-left-color: var(--color-primary); }
.flow[data-compact='true'] .flow__node[data-state='returned'] { border-left-color: var(--color-error); }
.flow[data-compact='true'] .flow__arrow { display: none; }
</style>
