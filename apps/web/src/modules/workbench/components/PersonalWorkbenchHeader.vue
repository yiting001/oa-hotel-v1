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
