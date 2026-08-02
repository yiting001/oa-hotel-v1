<script setup lang="ts">
import { computed } from 'vue';
import { appConfig } from '../../../shared/app-config';

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    marginMm?: number;
    documentNumber?: string;
    gridLineWidth?: number;
  }>(),
  { subtitle: '', marginMm: 14, documentNumber: '系统自动生成', gridLineWidth: 1 },
);

const sheetStyle = computed(() => ({
  '--a4-margin': `${props.marginMm}mm`,
  '--a4-grid-line': `${props.gridLineWidth}px`,
}));
</script>

<template>
  <article class="a4-sheet" :style="sheetStyle">
    <header class="a4-sheet__header">
      <h2>{{ title || '未命名审批单' }}</h2>
      <p v-if="subtitle">{{ subtitle }}</p>
      <div class="a4-sheet__meta">
        <span v-if="documentNumber">单据编号：{{ documentNumber }}</span>
        <span>版本：正式打印版</span>
      </div>
    </header>
    <div class="a4-sheet__body">
      <slot />
    </div>
    <footer class="a4-sheet__footer">
      <span>{{ appConfig.companyName }}{{ appConfig.productName }}</span>
      <span>第 1 页 / 共 1 页</span>
    </footer>
  </article>
</template>
