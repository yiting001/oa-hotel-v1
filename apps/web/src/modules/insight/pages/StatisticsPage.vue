<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue';
import type { EChartsOption } from 'echarts';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { apiRequest } from '../../../shared/api';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import EChart from '../../../shared/components/EChart.vue';
import WorkspaceMetricStrip from '../../../shared/components/WorkspaceMetricStrip.vue';
import UiDataList from '../../../ui/UiDataList.vue';
import { formatYuan } from '../../petty/petty.format';
import { INSIGHT_API, TRACKED_DOCUMENT_TYPE_OPTIONS } from '../insight.config';
import type { StatisticsBucket } from '../insight.types';

const loading = ref(false);
const buckets = ref<StatisticsBucket[]>([]);

const filters = reactive({
  granularity: 'month',
  dateRange: null as [string, string] | null,
});

const granularityOptions = [
  { value: 'day', label: '按日' },
  { value: 'week', label: '按周' },
  { value: 'month', label: '按月' },
  { value: 'year', label: '按年' },
];

interface PeriodRow {
  period: string;
  totalCount: number;
  totalAmountCents: number;
  countChange: number | null;
  amountChange: number | null;
  byType: Record<string, { count: number; amountCents: number }>;
}

const typeColumns = TRACKED_DOCUMENT_TYPE_OPTIONS;

const periodRows = computed<PeriodRow[]>(() => {
  const periods = new Map<string, PeriodRow>();
  for (const bucket of buckets.value) {
    const row = periods.get(bucket.period) ?? {
      period: bucket.period,
      totalCount: 0,
      totalAmountCents: 0,
      countChange: null,
      amountChange: null,
      byType: {},
    };
    row.totalCount += bucket.count;
    row.totalAmountCents += bucket.amountCents;
    row.byType[bucket.documentType] = {
      count: bucket.count,
      amountCents: bucket.amountCents,
    };
    periods.set(bucket.period, row);
  }
  const rows = [...periods.values()].sort((left, right) => left.period.localeCompare(right.period));
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1];
    const current = rows[index];
    current.countChange =
      previous.totalCount === 0
        ? null
        : Math.round(((current.totalCount - previous.totalCount) / previous.totalCount) * 100);
    current.amountChange =
      previous.totalAmountCents === 0
        ? null
        : Math.round(
            ((current.totalAmountCents - previous.totalAmountCents) / previous.totalAmountCents) *
              100,
          );
  }
  return rows.reverse();
});

const chronologicalRows = computed(() => [...periodRows.value].reverse());

const trendChartOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['提交单量', '金额（元）'] },
  grid: { left: 56, right: 72, top: 42, bottom: 32 },
  xAxis: { type: 'category', data: chronologicalRows.value.map((row) => row.period) },
  yAxis: [
    { type: 'value', name: '单量', minInterval: 1 },
    { type: 'value', name: '金额（元）' },
  ],
  series: [
    {
      name: '提交单量',
      type: 'line',
      smooth: true,
      data: chronologicalRows.value.map((row) => row.totalCount),
    },
    {
      name: '金额（元）',
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      data: chronologicalRows.value.map((row) => Math.round(row.totalAmountCents / 100)),
    },
  ],
}));

const typeBarChartOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: typeColumns.map((type) => type.label) },
  grid: { left: 56, right: 24, top: 42, bottom: 32 },
  xAxis: { type: 'category', data: chronologicalRows.value.map((row) => row.period) },
  yAxis: { type: 'value', name: '金额（元）' },
  series: typeColumns.map((type) => ({
    name: type.label,
    type: 'bar' as const,
    stack: 'amount',
    data: chronologicalRows.value.map((row) =>
      Math.round((row.byType[type.value]?.amountCents ?? 0) / 100),
    ),
  })),
}));

const typePieChartOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'item', formatter: '{b}：{c} 元（{d}%）' },
  legend: { bottom: 0 },
  series: [
    {
      type: 'pie',
      radius: ['38%', '66%'],
      avoidLabelOverlap: true,
      data: typeColumns.map((type) => ({
        name: type.label,
        value: Math.round(
          buckets.value
            .filter((bucket) => bucket.documentType === type.value)
            .reduce((sum, bucket) => sum + bucket.amountCents, 0) / 100,
        ),
      })),
    },
  ],
}));

const summary = computed(() => ({
  totalCount: periodRows.value.reduce((sum, row) => sum + row.totalCount, 0),
  totalAmountCents: periodRows.value.reduce((sum, row) => sum + row.totalAmountCents, 0),
}));

const columns = computed(() => [
  { key: 'period', label: '周期', minWidth: 115 },
  ...typeColumns.map((type) => ({ label: type.label, key: `type-${type.value}`, minWidth: 180 })),
  { key: 'totalCount', label: '合计单量', minWidth: 100 },
  { key: 'totalAmount', label: '合计金额', minWidth: 140 },
  { key: 'countChange', label: '单量环比', minWidth: 100 },
  { key: 'amountChange', label: '金额环比', minWidth: 100 },
]);

async function refresh(): Promise<void> {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    params.set('granularity', filters.granularity);
    if (filters.dateRange?.[0]) params.set('dateFrom', filters.dateRange[0]);
    if (filters.dateRange?.[1]) params.set('dateTo', filters.dateRange[1]);
    buckets.value = await apiRequest<StatisticsBucket[]>(
      `${INSIGHT_API.statistics}?${params.toString()}`,
    );
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '统计数据加载失败');
  } finally {
    loading.value = false;
  }
}

function changeTag(value: number | null): { text: string; color: string } {
  if (value === null) return { text: '-', color: 'default' };
  if (value > 0) return { text: `+${value}%`, color: 'red' };
  if (value < 0) return { text: `${value}%`, color: 'green' };
  return { text: '0%', color: 'default' };
}

onMounted(() => {
  void refresh();
});
</script>

<template>
  <main class="ui-page insight-statistics-page">
    <AppPageHeader eyebrow="运营分析" title="统计看板" />
    <div class="ui-toolbar insight-statistics-toolbar">
      <el-select v-model="filters.granularity" aria-label="统计周期" @change="refresh">
        <el-option v-for="option in granularityOptions" :key="option.value" :label="option.label" :value="option.value" />
      </el-select>
      <el-date-picker v-model="filters.dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" range-separator="至" @change="refresh" />
      <div class="ui-toolbar__end">
        <el-button :icon="Refresh" :loading="loading" @click="refresh">刷新</el-button>
      </div>
    </div>
    <WorkspaceMetricStrip
label="统计摘要" :items="[
      { key: 'count', label: '区间内提交单量', value: summary.totalCount },
      { key: 'amount', label: '区间内金额合计', value: formatYuan(summary.totalAmountCents) },
    ]" />
    <div class="insight-chart-grid">
      <section class="insight-chart-panel">
        <h2>单量与金额趋势</h2>
        <EChart :option="trendChartOption" />
      </section>
      <section class="insight-chart-panel">
        <h2>各模块金额占比</h2>
        <EChart :option="typePieChartOption" />
      </section>
    </div>
    <section class="insight-chart-panel insight-chart-panel--wide">
      <h2>各模块金额堆叠对比</h2>
      <EChart :option="typeBarChartOption" />
    </section>
    <section class="ui-section insight-period-section">
      <h2>周期明细</h2>
      <UiDataList :rows="periodRows" :columns="columns" :loading="loading" row-key="period" empty-text="暂无统计数据">
        <template v-for="type in typeColumns" :key="type.value" #[`cell-type-${type.value}`]="{ row }">
          {{ row.byType[type.value] ? `${row.byType[type.value].count} 单 / ${formatYuan(row.byType[type.value].amountCents)}` : '-' }}
        </template>
        <template #cell-totalAmount="{ row }">{{ formatYuan(row.totalAmountCents) }}</template>
        <template #cell-countChange="{ row }"><el-tag effect="plain" size="small" :type="row.countChange === null ? 'info' : row.countChange > 0 ? 'danger' : row.countChange < 0 ? 'success' : 'info'">{{ changeTag(row.countChange).text }}</el-tag></template>
        <template #cell-amountChange="{ row }"><el-tag effect="plain" size="small" :type="row.amountChange === null ? 'info' : row.amountChange > 0 ? 'danger' : row.amountChange < 0 ? 'success' : 'info'">{{ changeTag(row.amountChange).text }}</el-tag></template>
        <template #mobile-title="{ row }">{{ row.period }} · {{ row.totalCount }} 单</template>
        <template #mobile-summary="{ row }">
          <div class="insight-period-facts">
            <span>合计 {{ formatYuan(row.totalAmountCents) }}</span>
            <span>单量环比 {{ changeTag(row.countChange).text }} · 金额环比 {{ changeTag(row.amountChange).text }}</span>
            <span v-for="type in typeColumns" :key="type.value">{{ type.label }} {{ row.byType[type.value] ? `${row.byType[type.value].count} 单 / ${formatYuan(row.byType[type.value].amountCents)}` : '-' }}</span>
          </div>
        </template>
      </UiDataList>
    </section>
  </main>
</template>

<style scoped>
.insight-statistics-toolbar { margin-bottom: 16px; }
.insight-chart-grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 20px; }
.insight-chart-panel { min-width: 0; padding: 16px 0; border-top: 1px solid var(--color-border); }
.insight-chart-panel--wide { margin-top: 16px; }
.insight-chart-panel h2, .insight-period-section h2 { margin: 0 0 14px; font-size: 16px; font-weight: 650; }
.insight-period-section { margin-top: 16px; }
.insight-period-facts { display: grid; gap: 6px; color: var(--color-text-secondary); font-size: 12px; }
@media (max-width: 1023px) { .insight-chart-grid { grid-template-columns: 1fr; gap: 0; } }

.insight-statistics-page { display: flex; flex-direction: column; gap: 24px; }
</style>
