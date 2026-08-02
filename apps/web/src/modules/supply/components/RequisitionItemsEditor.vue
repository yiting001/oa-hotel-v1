<script setup lang="ts">
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue';
import { computed } from 'vue';
import { createRequisitionLine, fieldKey } from '../domain/supply-form';
import type { FieldErrors, MaterialItem, RequisitionLineForm } from '../types';

const props = defineProps<{
  modelValue: RequisitionLineForm[];
  materials: MaterialItem[];
  errors: FieldErrors;
  disabled?: boolean;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: RequisitionLineForm[]] }>();

const materialMap = computed(() => new Map(props.materials.map((item) => [item.id, item])));

function addLine(): void {
  emit('update:modelValue', [...props.modelValue, createRequisitionLine()]);
}

function removeLine(index: number): void {
  if (props.modelValue.length <= 1) {
    return;
  }
  emit(
    'update:modelValue',
    props.modelValue.filter((_, lineIndex) => lineIndex !== index),
  );
}

function updateLine(index: number, patch: Partial<RequisitionLineForm>): void {
  emit(
    'update:modelValue',
    props.modelValue.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
  );
}

function materialAt(index: number): MaterialItem | undefined {
  return materialMap.value.get(props.modelValue[index]?.materialItemId ?? '');
}

function errorAt(index: number, field: string): string | undefined {
  return props.errors[fieldKey(index, field)];
}

function selectedElsewhere(materialId: string, currentIndex: number): boolean {
  return props.modelValue.some(
    (line, index) => index !== currentIndex && line.materialItemId === materialId,
  );
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
</script>

<template>
  <div class="line-editor-toolbar">
    <span>从启用的库存项目中选择，共 {{ modelValue.length }} 项</span>
    <a-button :disabled="disabled" type="primary" ghost @click="addLine">
      <template #icon><PlusOutlined /></template>
      增加明细
    </a-button>
  </div>

  <a-alert v-if="errors.items" :message="errors.items" show-icon type="error" />

  <div class="requisition-table-wrap">
    <table class="requisition-table">
      <thead>
        <tr>
          <th class="sequence-column">序号</th>
          <th>库存物资<span>*</span></th>
          <th>货物编号</th>
          <th>品名</th>
          <th>规格</th>
          <th>单位</th>
          <th>可用库存</th>
          <th>请领数量<span>*</span></th>
          <th>用途<span>*</span></th>
          <th class="action-column">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(line, index) in modelValue" :key="line.key">
          <td class="sequence-cell">{{ index + 1 }}</td>
          <td>
            <a-select
              :disabled="disabled"
              :status="errorAt(index, 'materialItemId') ? 'error' : undefined"
              :value="line.materialItemId || undefined"
              class="full-control"
              option-filter-prop="label"
              placeholder="选择物资"
              show-search
              @update:value="(value: string) => updateLine(index, { materialItemId: value })"
            >
              <a-select-option
                v-for="material in materials"
                :key="material.id"
                :disabled="!material.active || selectedElsewhere(material.id, index)"
                :label="`${material.code} ${material.name} ${material.specification}`"
                :value="material.id"
              >
                {{ material.code }} · {{ material.name }}
              </a-select-option>
            </a-select>
            <small v-if="errorAt(index, 'materialItemId')" class="field-error">
              {{ errorAt(index, 'materialItemId') }}
            </small>
          </td>
          <td>{{ materialAt(index)?.code ?? '-' }}</td>
          <td>{{ materialAt(index)?.name ?? '-' }}</td>
          <td>{{ materialAt(index)?.specification ?? '-' }}</td>
          <td>{{ materialAt(index)?.unit ?? '-' }}</td>
          <td class="stock-cell">{{ materialAt(index)?.availableQuantity ?? '-' }}</td>
          <td>
            <a-input-number
              :disabled="disabled"
              :min="0"
              :precision="2"
              :status="errorAt(index, 'requestedQuantity') ? 'error' : undefined"
              :value="line.requestedQuantity"
              class="full-control"
              placeholder="0.00"
              @update:value="
                (value: unknown) => updateLine(index, { requestedQuantity: numberValue(value) })
              "
            />
            <small v-if="errorAt(index, 'requestedQuantity')" class="field-error">
              {{ errorAt(index, 'requestedQuantity') }}
            </small>
          </td>
          <td>
            <a-input
              :disabled="disabled"
              :maxlength="500"
              :status="errorAt(index, 'purpose') ? 'error' : undefined"
              :value="line.purpose"
              placeholder="说明领用用途"
              @update:value="(value: string) => updateLine(index, { purpose: value })"
            />
            <small v-if="errorAt(index, 'purpose')" class="field-error">
              {{ errorAt(index, 'purpose') }}
            </small>
          </td>
          <td class="action-cell">
            <a-tooltip title="删除明细">
              <a-button
                :aria-label="`删除第 ${index + 1} 条明细`"
                :disabled="disabled || modelValue.length <= 1"
                danger
                shape="circle"
                type="text"
                @click="removeLine(index)"
              >
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </a-tooltip>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="requisition-cards">
    <article v-for="(line, index) in modelValue" :key="line.key" class="line-card">
      <header>
        <strong>领用明细 {{ index + 1 }}</strong>
        <a-button
          :aria-label="`删除第 ${index + 1} 条明细`"
          :disabled="disabled || modelValue.length <= 1"
          danger
          shape="circle"
          type="text"
          @click="removeLine(index)"
        >
          <template #icon><DeleteOutlined /></template>
        </a-button>
      </header>
      <label class="mobile-field">
        <span>库存物资 <b>*</b></span>
        <a-select
          :disabled="disabled"
          :status="errorAt(index, 'materialItemId') ? 'error' : undefined"
          :value="line.materialItemId || undefined"
          class="full-control"
          option-filter-prop="label"
          placeholder="按编号或品名搜索"
          show-search
          @update:value="(value: string) => updateLine(index, { materialItemId: value })"
        >
          <a-select-option
            v-for="material in materials"
            :key="material.id"
            :disabled="!material.active || selectedElsewhere(material.id, index)"
            :label="`${material.code} ${material.name} ${material.specification}`"
            :value="material.id"
          >
            {{ material.code }} · {{ material.name }}
          </a-select-option>
        </a-select>
        <small v-if="errorAt(index, 'materialItemId')" class="field-error">
          {{ errorAt(index, 'materialItemId') }}
        </small>
      </label>
      <dl class="material-snapshot">
        <div>
          <dt>编号</dt>
          <dd>{{ materialAt(index)?.code ?? '-' }}</dd>
        </div>
        <div>
          <dt>品名</dt>
          <dd>{{ materialAt(index)?.name ?? '-' }}</dd>
        </div>
        <div>
          <dt>规格</dt>
          <dd>{{ materialAt(index)?.specification ?? '-' }}</dd>
        </div>
        <div>
          <dt>单位</dt>
          <dd>{{ materialAt(index)?.unit ?? '-' }}</dd>
        </div>
        <div>
          <dt>可用库存</dt>
          <dd>{{ materialAt(index)?.availableQuantity ?? '-' }}</dd>
        </div>
      </dl>
      <div class="mobile-field-grid">
        <label class="mobile-field">
          <span>请领数量 <b>*</b></span>
          <a-input-number
            :disabled="disabled"
            :min="0"
            :precision="2"
            :status="errorAt(index, 'requestedQuantity') ? 'error' : undefined"
            :value="line.requestedQuantity"
            class="full-control"
            @update:value="
              (value: unknown) => updateLine(index, { requestedQuantity: numberValue(value) })
            "
          />
          <small v-if="errorAt(index, 'requestedQuantity')" class="field-error">
            {{ errorAt(index, 'requestedQuantity') }}
          </small>
        </label>
        <label class="mobile-field">
          <span>用途 <b>*</b></span>
          <a-textarea
            :disabled="disabled"
            :maxlength="500"
            :rows="2"
            :status="errorAt(index, 'purpose') ? 'error' : undefined"
            :value="line.purpose"
            @update:value="(value: string) => updateLine(index, { purpose: value })"
          />
          <small v-if="errorAt(index, 'purpose')" class="field-error">
            {{ errorAt(index, 'purpose') }}
          </small>
        </label>
      </div>
    </article>
  </div>
</template>

<style scoped>
.line-editor-toolbar {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.line-editor-toolbar > span {
  color: #64748b;
  font-size: 13px;
}

.requisition-table-wrap {
  border: 1px solid #d8dee9;
  border-radius: 6px;
  overflow-x: auto;
}

.requisition-table {
  border-collapse: collapse;
  min-width: 1320px;
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
.mobile-field b {
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

th:nth-child(2) {
  width: 210px;
}

th:nth-child(3),
th:nth-child(4) {
  width: 140px;
}

th:nth-child(5) {
  width: 180px;
}

th:nth-child(6),
th:nth-child(7) {
  width: 90px;
}

th:nth-child(8) {
  width: 130px;
}

th:nth-child(9) {
  width: 210px;
}

.sequence-column,
.action-column {
  text-align: center;
  width: 58px;
}

.sequence-cell,
.action-cell {
  color: #64748b;
  text-align: center;
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

.requisition-cards {
  display: none;
}

@media (max-width: 900px) {
  .requisition-table-wrap {
    display: none;
  }

  .requisition-cards {
    display: grid;
    gap: 12px;
  }

  .line-card {
    border: 1px solid #d8dee9;
    border-radius: 6px;
    padding: 14px;
  }

  .line-card header {
    align-items: center;
    border-bottom: 1px solid #edf0f4;
    display: flex;
    justify-content: space-between;
    margin-bottom: 14px;
    padding-bottom: 8px;
  }

  .mobile-field > span {
    color: #475569;
    display: block;
    font-size: 13px;
    margin-bottom: 6px;
  }

  .material-snapshot {
    background: #f7f9fc;
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 12px 0;
    padding: 12px;
  }

  .material-snapshot div:last-child {
    grid-column: 1 / -1;
  }

  dt {
    color: #64748b;
    font-size: 12px;
  }

  dd {
    color: #1e293b;
    margin: 2px 0 0;
  }

  .mobile-field-grid {
    display: grid;
    gap: 12px;
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  }
}

@media (max-width: 520px) {
  .mobile-field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
