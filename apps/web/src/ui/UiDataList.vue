<script setup lang="ts" generic="T extends object">
import { computed, nextTick, ref, useSlots, watch } from 'vue';
import type { TableInstance } from 'element-plus';
import { Document } from '@element-plus/icons-vue';
import { useLayoutMode } from './useLayoutMode';

export interface DataColumn {
  key: string;
  label: string;
  width?: number;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
}

const props = withDefaults(defineProps<{
  rows: T[];
  columns: DataColumn[];
  loading?: boolean;
  rowKey?: string;
  emptyText?: string;
  selectable?: boolean;
  selectedKeys?: string[];
  /** 列表根节点 testid：桌面与手机共用同一根，便于用例按角色/文本继续定位 */
  testId?: string;
  /** 手机卡片 testid */
  cardTestId?: (row: T) => string;
  /** 手机卡片选择框 testid */
  selectionTestId?: (row: T) => string;
}>(), {
  loading: false,
  rowKey: 'id',
  emptyText: '暂无符合条件的记录',
  selectable: false,
  selectedKeys: () => [],
  testId: undefined,
  cardTestId: undefined,
  selectionTestId: undefined,
});
const emit = defineEmits<{
  'row-click': [row: T];
  'selection-change': [rows: T[]];
}>();
const slots = useSlots();
const { isCompact } = useLayoutMode();
const table = ref<TableInstance>();
const firstColumn = computed(() => props.columns[0]);
const details = computed(() => props.columns.slice(1).filter((column) => column.key !== 'actions'));
let synchronizing = false;

function value(row: T, key: string): unknown {
  return key.split('.').reduce<unknown>((current, part) =>
    current && typeof current === 'object' ? (current as Record<string, unknown>)[part] : undefined,
  row);
}
function text(row: T, key: string): string {
  const result = value(row, key);
  return result === null || result === undefined || result === '' ? '—' : String(result);
}
function keyOf(row: T): string { return String(value(row, props.rowKey)); }
function selectCard(row: T, checked: boolean): void {
  const keys = new Set(props.selectedKeys);
  if (checked) keys.add(keyOf(row)); else keys.delete(keyOf(row));
  emit('selection-change', props.rows.filter((item) => keys.has(keyOf(item))));
}
function selectTable(rows: T[]): void {
  if (!synchronizing) emit('selection-change', rows);
}
watch(() => [props.rows, props.selectedKeys, isCompact.value], async () => {
  await nextTick();
  if (!table.value || !props.selectable) return;
  synchronizing = true;
  table.value.clearSelection();
  for (const row of props.rows) {
    if (props.selectedKeys.includes(keyOf(row))) table.value.toggleRowSelection(row, true);
  }
  await nextTick();
  synchronizing = false;
}, { deep: true, immediate: true });
</script>

<template>
  <section
    class="ui-data-list"
    :data-presentation="isCompact ? 'cards' : 'table'"
    :data-testid="testId"
    :aria-busy="loading"
  >
    <el-table
      v-if="!isCompact"
      ref="table"
      v-loading="loading"
      :data="rows"
      :row-key="rowKey"
      class="ui-data-table"
      @selection-change="selectTable"
      @row-click="(row: T) => emit('row-click', row)"
    >
      <el-table-column v-if="selectable" type="selection" width="48" reserve-selection />
      <el-table-column
        v-for="column in columns.filter((item) => item.key !== 'actions')"
        :key="column.key"
        :prop="column.key"
        :label="column.label"
        :width="column.width"
        :min-width="column.minWidth ?? (column.width ? undefined : 140)"
        :align="column.align ?? 'left'"
      >
        <template #default="{ row }">
          <slot :name="`cell-${column.key}`" :row="row" :value="value(row, column.key)">{{ text(row, column.key) }}</slot>
        </template>
      </el-table-column>
      <el-table-column v-if="slots.actions" label="操作" :width="columns.find((item) => item.key === 'actions')?.width ?? 152" align="right" fixed="right">
        <template #default="{ row }"><div class="ui-row-actions" @click.stop><slot name="actions" :row="row" /></div></template>
      </el-table-column>
      <template #empty><div class="ui-empty"><el-icon :size="28"><Document /></el-icon><p>{{ emptyText }}</p></div></template>
    </el-table>
    <div v-else class="ui-record-list">
      <el-skeleton v-if="loading && !rows.length" :rows="6" animated />
      <article v-for="row in rows" :key="keyOf(row)" :data-testid="cardTestId?.(row)" class="ui-record">
        <header class="ui-record__heading">
          <el-checkbox
            v-if="selectable"
            :data-testid="selectionTestId?.(row)"
            :model-value="selectedKeys.includes(keyOf(row))"
            :aria-label="`选择${firstColumn ? text(row, firstColumn.key) : '记录'}`"
            @change="(checked: string | number | boolean) => selectCard(row, Boolean(checked))"
          />
          <div class="ui-record__title">
            <slot name="mobile-title" :row="row">
              <slot v-if="firstColumn" :name="`cell-${firstColumn.key}`" :row="row" :value="value(row, firstColumn.key)">{{ text(row, firstColumn.key) }}</slot>
            </slot>
          </div>
        </header>
        <slot name="mobile-summary" :row="row">
          <dl class="ui-record__facts">
            <div v-for="column in details" :key="column.key">
              <dt>{{ column.label }}</dt>
              <dd><slot :name="`cell-${column.key}`" :row="row" :value="value(row, column.key)">{{ text(row, column.key) }}</slot></dd>
            </div>
          </dl>
        </slot>
        <footer v-if="slots.actions" class="ui-record__actions"><slot name="actions" :row="row" /></footer>
      </article>
      <div v-if="!loading && !rows.length" class="ui-empty"><el-icon :size="28"><Document /></el-icon><p>{{ emptyText }}</p></div>
    </div>
  </section>
</template>
