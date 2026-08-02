<script setup lang="ts">
import { ReloadOutlined } from '@ant-design/icons-vue';
import type { EChartsOption } from 'echarts';
import { message } from 'ant-design-vue';
import { computed, onMounted, reactive, ref } from 'vue';
import { apiRequest } from '../../../shared/api';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import EChart from '../../../shared/components/EChart.vue';
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
  { title: '周期', dataIndex: 'period' },
  ...typeColumns.map((type) => ({ title: type.label, key: `type-${type.value}` })),
  { title: '合计单量', dataIndex: 'totalCount' },
  { title: '合计金额', key: 'totalAmount' },
  { title: '单量环比', key: 'countChange' },
  { title: '金额环比', key: 'amountChange' },
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
    message.error(error instanceof Error ? error.message : '统计数据加载失败');
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
  <div class="insight-statistics-page">
    <AppPageHeader
      description="按日/周/月/年统计三大模块单量与金额，支持多周期对比"
      eyebrow="运营分析"
      title="统计看板"
    />

    <a-card size="small" style="margin-bottom: 16px">
      <a-space wrap>
        <a-select
          v-model:value="filters.granularity"
          :options="granularityOptions"
          style="width: 120px"
          @change="refresh"
        />
        <a-range-picker
          v-model:value="filters.dateRange"
          value-format="YYYY-MM-DD"
          @change="refresh"
        />
        <a-button @click="refresh">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </a-space>
    </a-card>

    <a-row :gutter="16" style="margin-bottom: 16px">
      <a-col :span="12">
        <a-card size="small">
          <a-statistic :value="summary.totalCount" title="区间内提交单量" />
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card size="small">
          <a-statistic :value="formatYuan(summary.totalAmountCents)" title="区间内金额合计" />
        </a-card>
      </a-col>
    </a-row>

    <a-row :gutter="16" style="margin-bottom: 16px">
      <a-col :lg="14" :span="24">
        <a-card size="small" title="单量与金额趋势">
          <EChart :option="trendChartOption" />
        </a-card>
      </a-col>
      <a-col :lg="10" :span="24">
        <a-card size="small" title="各模块金额占比">
          <EChart :option="typePieChartOption" />
        </a-card>
      </a-col>
    </a-row>

    <a-card size="small" style="margin-bottom: 16px" title="各模块金额堆叠对比">
      <EChart :option="typeBarChartOption" />
    </a-card>

    <a-table
      :columns="columns"
      :data-source="periodRows"
      :loading="loading"
      :pagination="false"
      row-key="period"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-for="type in typeColumns" :key="type.value">
          <template v-if="column.key === `type-${type.value}`">
            {{
              (record as PeriodRow).byType[type.value]
                ? `${(record as PeriodRow).byType[type.value].count} 单 / ${formatYuan(
                    (record as PeriodRow).byType[type.value].amountCents,
                  )}`
                : '-'
            }}
          </template>
        </template>
        <template v-if="column.key === 'totalAmount'">
          {{ formatYuan((record as PeriodRow).totalAmountCents) }}
        </template>
        <template v-else-if="column.key === 'countChange'">
          <a-tag :color="changeTag((record as PeriodRow).countChange).color">
            {{ changeTag((record as PeriodRow).countChange).text }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'amountChange'">
          <a-tag :color="changeTag((record as PeriodRow).amountChange).color">
            {{ changeTag((record as PeriodRow).amountChange).text }}
          </a-tag>
        </template>
      </template>
    </a-table>
  </div>
</template>
