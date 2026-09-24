<script setup lang="ts">
import * as echarts from 'echarts';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { chartThemeName, registerChartTheme } from '../chart-theme';

const props = defineProps<{ option: echarts.EChartsOption; height?: string }>();
const container = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;
let resizeObserver: ResizeObserver | null = null;
function themedOption(option: echarts.EChartsOption): echarts.EChartsOption { return { backgroundColor: 'transparent', ...option }; }
onMounted(() => {
  if (!container.value) return;
  registerChartTheme();
  chart = echarts.init(container.value, chartThemeName);
  chart.setOption(themedOption(props.option));
  resizeObserver = new ResizeObserver(() => chart?.resize());
  resizeObserver.observe(container.value);
});
watch(() => props.option, (option) => chart?.setOption(themedOption(option), { notMerge: true }), { deep: true });
onBeforeUnmount(() => { resizeObserver?.disconnect(); chart?.dispose(); chart = null; });
</script>

<template>
  <div ref="container" class="echart-container" role="img" aria-label="数据图表" :style="{ height: height ?? '320px' }" />
</template>

<style scoped>
.echart-container { width: 100%; min-width: 0; }
</style>
