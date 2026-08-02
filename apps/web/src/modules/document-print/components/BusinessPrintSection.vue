<script setup lang="ts">
import { computed } from 'vue';
import type { BusinessPrintSection } from '../domain/document-print';

const props = defineProps<{ section: BusinessPrintSection }>();

const blankTableRows = computed(() => {
  if (props.section.type !== 'TABLE') return [];
  return Array.from(
    { length: Math.max(0, props.section.table.minRows - props.section.table.rows.length) },
    (_, index) => index,
  );
});
</script>

<template>
  <dl v-if="section.type === 'GRID'" class="business-print-grid">
    <div
      v-for="(row, rowIndex) in section.rows"
      :key="rowIndex"
      class="business-print-grid__row"
      :style="{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }"
    >
      <div
        v-for="item in row"
        :key="`${item.key ?? item.label}-${item.value}`"
        class="business-print-field"
      >
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
      </div>
    </div>
  </dl>

  <section
    v-else-if="section.type === 'CONTENT'"
    class="business-print-block"
    :class="`business-print-block--${section.block.size}`"
    :style="section.block.minHeightMm ? { minHeight: `${section.block.minHeightMm}mm` } : undefined"
  >
    <h2>{{ section.block.label }}</h2>
    <div>{{ section.block.value }}</div>
  </section>

  <section v-else-if="section.type === 'TABLE'" class="business-print-table-section">
    <h2>{{ section.table.title }}</h2>
    <table>
      <colgroup>
        <col
          v-for="(column, index) in section.table.columns"
          :key="`${column.label}-${index}`"
          :style="column.width ? { width: column.width } : undefined"
        />
      </colgroup>
      <thead>
        <tr>
          <th v-for="column in section.table.columns" :key="column.label" scope="col">
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIndex) in section.table.rows" :key="rowIndex">
          <td v-for="(value, columnIndex) in row" :key="columnIndex">{{ value }}</td>
        </tr>
        <tr v-for="rowIndex in blankTableRows" :key="`blank-${rowIndex}`" aria-hidden="true">
          <td
            v-for="(_, columnIndex) in section.table.columns"
            :key="columnIndex"
            class="business-print-table__blank"
          >
            &nbsp;
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <section
    v-else-if="section.type === 'ATTACHMENTS'"
    class="business-print-attachments"
    :style="section.minHeightMm ? { minHeight: `${section.minHeightMm}mm` } : undefined"
  >
    <h2>{{ section.label }}</h2>
    <ol v-if="section.items.length">
      <li v-for="(attachment, index) in section.items" :key="`${attachment}-${index}`">
        {{ attachment }}
      </li>
    </ol>
    <div v-else>无</div>
  </section>

  <section
    v-else
    class="business-print-opinions"
    :style="section.minHeightMm ? { minHeight: `${section.minHeightMm}mm` } : undefined"
  >
    <h2>{{ section.label }}</h2>
    <div v-if="section.opinions.length" class="business-print-opinions__list">
      <article v-for="opinion in section.opinions" :key="opinion.id" class="business-print-opinion">
        <div class="business-print-opinion__meta">
          <strong>{{ opinion.nodeName }}</strong>
          <span>{{ opinion.actorName }}</span>
          <span v-if="opinion.organization">{{ opinion.organization }}</span>
          <span>{{ opinion.action }}</span>
          <time>{{ opinion.createdAt }}</time>
        </div>
        <p>{{ opinion.comment }}</p>
      </article>
    </div>
    <div v-else class="business-print-opinions__empty">暂无审批意见</div>
  </section>
</template>
