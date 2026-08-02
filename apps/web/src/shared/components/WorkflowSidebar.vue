<script setup lang="ts">
import type { WorkflowOverview } from '@oa/contracts';
import { computed } from 'vue';
import { approvalActionLabels, workflowNodeLabel } from '../document';
import { formatDateTime } from '../format';

const props = defineProps<{
  overview: WorkflowOverview | null;
  loading?: boolean;
}>();

const currentStep = computed(() => {
  if (!props.overview) {
    return 0;
  }
  if (props.overview.document.status === 'APPROVED') {
    return props.overview.definition.steps.length;
  }
  return props.overview.document.currentStep ?? 0;
});

const stepItems = computed(
  () => props.overview?.definition.steps.map((step) => ({ title: workflowNodeLabel(step) })) ?? [],
);
</script>

<template>
  <a-skeleton v-if="loading" active :paragraph="{ rows: 8 }" />
  <div v-else-if="overview" class="workflow-sidebar">
    <section>
      <div class="sidebar-section-title">审批路径</div>
      <div class="workflow-version">
        {{ overview.definition.name }} · V{{ overview.definition.version }}
      </div>
      <a-steps :current="currentStep" :items="stepItems" direction="vertical" size="small" />
    </section>
    <a-divider />
    <section>
      <div class="sidebar-section-title">审批记录</div>
      <a-empty v-if="overview.opinions.length === 0" description="暂无审批记录" />
      <a-timeline v-else>
        <a-timeline-item v-for="opinion in overview.opinions" :key="opinion.id">
          <strong>{{ approvalActionLabels[opinion.action] ?? opinion.action }}</strong>
          <div>{{ opinion.actorName }} · {{ formatDateTime(opinion.createdAt) }}</div>
          <p>{{ opinion.comment }}</p>
        </a-timeline-item>
      </a-timeline>
    </section>
  </div>
  <a-empty v-else description="保存草稿后显示审批路径" />
</template>
