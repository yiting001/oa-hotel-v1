<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue';
import WorkbenchMetrics from './WorkbenchMetrics.vue';

interface MetricItem {
  key: string;
  label: string;
  count: number;
  hint: string;
}

defineProps<{
  description: string;
  eyebrow: string;
  items: MetricItem[];
  loading: boolean;
  title: string;
}>();
const emit = defineEmits<{
  refresh: [];
  select: [key: string];
}>();
</script>

<template>
  <header class="workbench-page-header">
    <div>
      <span>{{ eyebrow }}</span>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
    <div>
      <el-button :icon="Refresh" :loading="loading" @click="emit('refresh')">刷新</el-button>
    </div>
  </header>
  <WorkbenchMetrics :items="items" @select="emit('select', $event)" />
</template>

<style scoped>
.workbench-page-header {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--color-border);
}
.workbench-page-header > div:first-child { min-width: 0; flex: 1 1 320px; }
.workbench-page-header > div:first-child > span { display: block; margin-bottom: 8px; color: var(--color-text-tertiary); font-size: 12px; font-weight: 600; }
.workbench-page-header h1 { margin: 0; font-size: 32px; font-weight: 600; line-height: 1.25; overflow-wrap: anywhere; }
.workbench-page-header p { margin: 8px 0 0; max-width: 76ch; color: var(--color-text-tertiary); font-size: 14px; line-height: 1.6; }
.workbench-page-header > div:last-child { display: flex; flex: 0 0 auto; align-items: center; gap: 8px; padding-top: 4px; }
html[data-layout='compact'] .workbench-page-header { flex-direction: column; align-items: stretch; gap: 16px; padding-bottom: 16px; }
html[data-layout='compact'] .workbench-page-header > div:first-child { flex: 0 0 auto; }
html[data-layout='compact'] .workbench-page-header h1 { font-size: 24px; }
html[data-layout='compact'] .workbench-page-header > div:last-child { padding-top: 0; }
</style>
