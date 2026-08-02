<script setup lang="ts">
import { DocumentAdd, Refresh } from '@element-plus/icons-vue';
import type { ProcessStartItem } from '../../../shared/process-start';
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
  quickStarts: ProcessStartItem[];
  title: string;
}>();
const emit = defineEmits<{
  refresh: [];
  select: [key: string];
  start: [path: string];
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
      <el-button v-if="quickStarts.length" type="primary" @click="emit('start', '/start')">
        <el-icon><DocumentAdd /></el-icon>发起申请
      </el-button>
      <el-button :icon="Refresh" :loading="loading" @click="emit('refresh')">刷新</el-button>
    </div>
  </header>
  <WorkbenchMetrics :items="items" @select="emit('select', $event)" />
</template>
