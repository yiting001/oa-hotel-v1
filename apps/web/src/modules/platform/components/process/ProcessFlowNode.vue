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
      {{ { START: '开始', USER_TASK: '审批', END: '结束' }[data.nodeType] }}
    </span>
    <strong>{{ data.name }}</strong>
    <small v-if="data.nodeType === 'USER_TASK'">{{ data.assignee }}</small>
    <Handle v-if="data.nodeType !== 'END'" :position="Position.Right" type="source" />
  </div>
</template>
