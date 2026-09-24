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

<style scoped>
/* 纸张几何（210 × 297 mm）与打印网格线宽度由 --a4-margin / --a4-grid-line 注入，保持毫米基准不变。 */
.a4-sheet {
  display: flex;
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  flex-direction: column;
  padding: var(--a4-margin);
  color: #111;
  background: #fff;
  box-shadow: 0 8px 28px rgba(20, 20, 19, 0.16);
  font-family: SimSun, 'Songti SC', serif;
  letter-spacing: 0;
}
.a4-sheet__header { margin-bottom: 7mm; text-align: center; }
.a4-sheet__header h2 { margin: 0; font-family: SimSun, 'Songti SC', serif; font-size: 22pt; font-weight: 500; letter-spacing: 0; }
.a4-sheet__header p { margin: 2.5mm 0 0; color: #333; font-size: 10.5pt; }
.a4-sheet__meta { display: flex; justify-content: space-between; margin-top: 5mm; font-size: 9pt; text-align: left; }
.a4-sheet__body { flex: 1; }
.a4-sheet__footer {
  display: flex;
  justify-content: space-between;
  margin-top: 6mm;
  padding-top: 2mm;
  color: #444;
  border-top: 0.5px solid #777;
  font-size: 8pt;
}

/* 打印：纸张由页面按 A4 定位，这里只负责还原缩放与取消屏幕阴影。 */
@media print {
  .a4-sheet { margin: 0; box-shadow: none; zoom: 1 !important; }
  .a4-sheet__footer { break-inside: avoid; }
}
</style>
