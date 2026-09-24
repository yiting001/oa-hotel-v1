<script setup lang="ts">
import type { WorkflowOverview } from '@oa/contracts';
import { computed } from 'vue';
import { approvalActionLabels, workflowNodeLabel } from '../document';
import { formatDateTime } from '../format';

const props = defineProps<{ overview: WorkflowOverview | null; loading?: boolean }>();
const currentStep = computed(() => props.overview?.document.currentStep ?? 0);
function stepState(index: number): string {
  if (!props.overview) return 'pending';
  if (props.overview.document.status === 'APPROVED' || (props.overview.document.status === 'IN_REVIEW' && index < currentStep.value)) return 'done';
  if (props.overview.document.status === 'IN_REVIEW' && index === currentStep.value) return 'current';
  return 'pending';
}
</script>

<template>
  <el-skeleton v-if="loading" :rows="8" animated />
  <div v-else-if="overview" class="workflow-sidebar">
    <section class="workflow-sidebar__section">
      <h2>审批路径</h2>
      <p class="workflow-sidebar__version ui-text-muted">{{ overview.definition.name }} · V{{ overview.definition.version }}</p>
      <ol class="workflow-sidebar__steps">
        <li v-for="(step, index) in overview.definition.steps" :key="`${step}-${index}`" :class="`workflow-sidebar__step--${stepState(index)}`">
          <span class="workflow-sidebar__index">{{ index + 1 }}</span>
          <span>{{ workflowNodeLabel(step) }}<small>{{ stepState(index) === 'done' ? '已完成' : stepState(index) === 'current' ? '办理中' : '待流转' }}</small></span>
        </li>
      </ol>
    </section>
    <section class="workflow-sidebar__section">
      <h2>审批记录</h2>
      <p v-if="overview.opinions.length === 0" class="ui-text-muted">暂无审批记录</p>
      <ol v-else class="workflow-sidebar__opinions">
        <li v-for="opinion in overview.opinions" :key="opinion.id">
          <strong>{{ approvalActionLabels[opinion.action] ?? opinion.action }}</strong>
          <small>{{ opinion.actorName }} · {{ formatDateTime(opinion.createdAt) }}</small>
          <p>{{ opinion.comment }}</p>
        </li>
      </ol>
    </section>
  </div>
  <p v-else class="ui-text-muted">保存草稿后显示审批路径</p>
</template>

<style scoped>
.workflow-sidebar { min-width: 0; }
.workflow-sidebar__section + .workflow-sidebar__section { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--color-border); }
.workflow-sidebar h2 { margin: 0 0 10px; font-family: inherit; font-size: 16px; font-weight: 600; letter-spacing: 0; }
.workflow-sidebar__version { margin: 0 0 16px; font-size: 12px; }
.workflow-sidebar__steps, .workflow-sidebar__opinions { margin: 0; padding: 0; list-style: none; }
.workflow-sidebar__steps { display: grid; gap: 0; }
.workflow-sidebar__steps li { display: flex; gap: 12px; align-items: flex-start; min-height: 48px; padding: 0 0 12px; color: var(--color-text-secondary); }
.workflow-sidebar__index { display: grid; place-items: center; flex: 0 0 24px; height: 24px; border-radius: 50%; background: #e9edf0; font-size: 12px; font-variant-numeric: tabular-nums; }
.workflow-sidebar__step--done .workflow-sidebar__index { background: #e2f2e9; color: #286c52; }
.workflow-sidebar__step--current .workflow-sidebar__index { background: #d9f0ef; color: #176b66; font-weight: 600; }
.workflow-sidebar__steps small, .workflow-sidebar__opinions small { display: block; margin-top: 3px; color: var(--color-text-secondary); font-size: 12px; }
.workflow-sidebar__opinions li { padding: 0 0 14px 12px; border-left: 2px solid var(--color-border); overflow-wrap: anywhere; }
.workflow-sidebar__opinions p { margin: 6px 0 0; white-space: pre-wrap; font-size: 13px; }
</style>
