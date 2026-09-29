<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import type { ProcessNodeType } from '../../types/designer';

defineProps<{
  data: { nodeType: ProcessNodeType; name: string; assignee: string };
  selected: boolean;
}>();
</script>

<template>
  <div
    class="process-flow-node"
    :class="[`process-flow-node--${data.nodeType.toLowerCase()}`, { 'is-selected': selected }]"
  >
    <Handle v-if="data.nodeType !== 'START'" :position="Position.Left" type="target" />
    <span class="process-flow-node__type">
      {{ { START: '开始', USER_TASK: '审批', MANUAL_CHOICE: '选择下一步', END: '结束' }[data.nodeType] }}
    </span>
    <strong>{{ data.name }}</strong>
    <small v-if="data.nodeType === 'USER_TASK' || data.nodeType === 'MANUAL_CHOICE'">{{ data.assignee }}</small>
    <Handle v-if="data.nodeType !== 'END'" :position="Position.Right" type="source" />
  </div>
</template>

<style scoped>
.process-flow-node {
  display: flex;
  min-width: 164px;
  min-height: 72px;
  flex-direction: column;
  justify-content: center;
  padding: 10px 15px;
  background: var(--color-canvas);
  border: 1px solid var(--color-border-strong);
  border-left: 4px solid var(--color-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-panel);
}
.process-flow-node.is-selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}
.process-flow-node--start { border-left-color: var(--color-success); }
.process-flow-node--end { border-left-color: var(--color-danger); }
.process-flow-node__type {
  margin-bottom: 2px;
  color: var(--color-text-secondary);
  font-size: 10px;
  font-weight: 500;
}
.process-flow-node strong {
  max-width: 180px;
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.process-flow-node small {
  margin-top: 3px;
  color: var(--color-text-secondary);
  font-size: 10px;
}
.process-flow-node .vue-flow__handle {
  width: 9px;
  height: 9px;
  background: var(--color-primary);
  border: 2px solid var(--color-surface);
}
</style>
