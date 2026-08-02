<script setup lang="ts">
import { computed } from 'vue';
import { fieldKey } from '../domain/supply-form';
import type { FieldErrors, IssueLineForm, MaterialItem, MaterialRequisitionRecord } from '../types';

const props = defineProps<{
  modelValue: IssueLineForm[];
  requisition: MaterialRequisitionRecord;
  inventory: MaterialItem[];
  errors: FieldErrors;
  disabled?: boolean;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: IssueLineForm[]] }>();

const stockMap = computed(
  () => new Map(props.inventory.map((item) => [item.id, item.availableQuantity])),
);

function updateLine(index: number, patch: Partial<IssueLineForm>): void {
  emit(
    'update:modelValue',
    props.modelValue.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
  );
}

function errorAt(index: number, field: string): string | undefined {
  return props.errors[fieldKey(index, field)];
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
</script>

<template>
  <a-alert v-if="errors.items" :message="errors.items" show-icon type="error" />
  <a-alert v-if="errors.issuedAt" :message="errors.issuedAt" show-icon type="error" />

  <div class="issue-table-wrap">
    <table class="issue-table">
      <thead>
        <tr>
          <th>货物编号</th>
          <th>品名</th>
          <th>规格</th>
          <th>单位</th>
          <th>用途</th>
          <th>请领数量</th>
          <th>可用库存</th>
          <th>实发数量<span>*</span></th>
          <th>实发时间<span>*</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in requisition.items" :key="item.materialItemId">
          <td>{{ item.itemCode }}</td>
          <td>{{ item.name }}</td>
          <td>{{ item.specification }}</td>
          <td>{{ item.unit }}</td>
          <td>{{ item.purpose }}</td>
          <td>{{ item.requestedQuantity }}</td>
          <td class="stock-cell">{{ stockMap.get(item.materialItemId) ?? '-' }}</td>
          <td>
            <a-input-number
              :disabled="disabled"
              :max="Number(item.requestedQuantity)"
              :min="0"
              :precision="2"
              :status="errorAt(index, 'issuedQuantity') ? 'error' : undefined"
              :value="modelValue[index]?.issuedQuantity"
              class="full-control"
              placeholder="0.00"
              @update:value="
                (value: unknown) => updateLine(index, { issuedQuantity: numberValue(value) })
              "
            />
            <small v-if="errorAt(index, 'issuedQuantity')" class="field-error">
              {{ errorAt(index, 'issuedQuantity') }}
            </small>
          </td>
          <td>
            <a-input
              :disabled="disabled"
              :status="errorAt(index, 'issuedAt') ? 'error' : undefined"
              :value="modelValue[index]?.issuedAt"
              type="datetime-local"
              @update:value="(value: string) => updateLine(index, { issuedAt: value })"
            />
            <small v-if="errorAt(index, 'issuedAt')" class="field-error">
              {{ errorAt(index, 'issuedAt') }}
            </small>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="issue-cards">
    <article
      v-for="(item, index) in requisition.items"
      :key="item.materialItemId"
      class="issue-card"
    >
      <header>
        <div>
          <strong>{{ item.name }}</strong>
          <span>{{ item.itemCode }}</span>
        </div>
        <span>{{ item.specification }} / {{ item.unit }}</span>
      </header>
      <dl>
        <div>
          <dt>用途</dt>
          <dd>{{ item.purpose }}</dd>
        </div>
        <div>
          <dt>请领数量</dt>
          <dd>{{ item.requestedQuantity }}</dd>
        </div>
        <div>
          <dt>可用库存</dt>
          <dd>{{ stockMap.get(item.materialItemId) ?? '-' }}</dd>
        </div>
      </dl>
      <div class="issue-input-grid">
        <label>
          <span>实发数量 <b>*</b></span>
          <a-input-number
            :disabled="disabled"
            :max="Number(item.requestedQuantity)"
            :min="0"
            :precision="2"
            :status="errorAt(index, 'issuedQuantity') ? 'error' : undefined"
            :value="modelValue[index]?.issuedQuantity"
            class="full-control"
            @update:value="
              (value: unknown) => updateLine(index, { issuedQuantity: numberValue(value) })
            "
          />
          <small v-if="errorAt(index, 'issuedQuantity')" class="field-error">
            {{ errorAt(index, 'issuedQuantity') }}
          </small>
        </label>
        <label>
          <span>实发时间 <b>*</b></span>
          <a-input
            :disabled="disabled"
            :status="errorAt(index, 'issuedAt') ? 'error' : undefined"
            :value="modelValue[index]?.issuedAt"
            type="datetime-local"
            @update:value="(value: string) => updateLine(index, { issuedAt: value })"
          />
          <small v-if="errorAt(index, 'issuedAt')" class="field-error">
            {{ errorAt(index, 'issuedAt') }}
          </small>
        </label>
      </div>
    </article>
  </div>
</template>

<style scoped>
.issue-table-wrap {
  border: 1px solid #d8dee9;
  border-radius: 6px;
  overflow-x: auto;
}

.issue-table {
  border-collapse: collapse;
  min-width: 1280px;
  table-layout: fixed;
  width: 100%;
}

th {
  background: #f5f7fa;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  padding: 11px 8px;
  text-align: left;
}

th > span,
.issue-input-grid b {
  color: #cf1322;
  font-weight: 400;
  margin-left: 2px;
}

td {
  border-top: 1px solid #e5e9f0;
  color: #334155;
  padding: 10px 8px;
  vertical-align: top;
}

th:nth-child(1),
th:nth-child(2) {
  width: 135px;
}

th:nth-child(3),
th:nth-child(5) {
  width: 170px;
}

th:nth-child(4) {
  width: 75px;
}

th:nth-child(6),
th:nth-child(7) {
  width: 100px;
}

th:nth-child(8) {
  width: 135px;
}

th:nth-child(9) {
  width: 210px;
}

.stock-cell {
  color: #0f766e;
  font-weight: 600;
}

.full-control {
  width: 100%;
}

.field-error {
  color: #cf1322;
  display: block;
  font-size: 12px;
  line-height: 1.35;
  margin-top: 4px;
}

.issue-cards {
  display: none;
}

@media (max-width: 900px) {
  .issue-table-wrap {
    display: none;
  }

  .issue-cards {
    display: grid;
    gap: 12px;
  }

  .issue-card {
    border: 1px solid #d8dee9;
    border-radius: 6px;
    padding: 14px;
  }

  .issue-card header {
    align-items: flex-start;
    border-bottom: 1px solid #edf0f4;
    display: flex;
    gap: 12px;
    justify-content: space-between;
    padding-bottom: 10px;
  }

  .issue-card header div {
    display: grid;
    gap: 2px;
  }

  .issue-card header span {
    color: #64748b;
    font-size: 12px;
  }

  .issue-card dl {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 12px 0;
  }

  .issue-card dl div:first-child {
    grid-column: 1 / -1;
  }

  dt {
    color: #64748b;
    font-size: 12px;
  }

  dd {
    margin: 2px 0 0;
  }

  .issue-input-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr);
  }

  .issue-input-grid label > span {
    color: #475569;
    display: block;
    font-size: 13px;
    margin-bottom: 6px;
  }
}

@media (max-width: 520px) {
  .issue-input-grid {
    grid-template-columns: 1fr;
  }
}
</style>
