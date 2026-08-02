<script setup lang="ts">
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue';
import MoneyInput from '../../../shared/components/MoneyInput.vue';
import { createPurchaseLine, fieldKey } from '../domain/supply-form';
import type { FieldErrors, PurchaseLineForm } from '../types';

const props = defineProps<{
  modelValue: PurchaseLineForm[];
  errors: FieldErrors;
  disabled?: boolean;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: PurchaseLineForm[]] }>();

function addLine(): void {
  emit('update:modelValue', [...props.modelValue, createPurchaseLine()]);
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

function updateLine(index: number, patch: Partial<PurchaseLineForm>): void {
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
  <div class="line-editor-toolbar">
    <span>共 {{ modelValue.length }} 项</span>
    <a-button :disabled="disabled" type="primary" ghost @click="addLine">
      <template #icon><PlusOutlined /></template>
      增加明细
    </a-button>
  </div>

  <a-alert v-if="errors.items" :message="errors.items" show-icon type="error" />

  <div class="purchase-table-wrap">
    <table class="purchase-table">
      <thead>
        <tr>
          <th class="sequence-column">序号</th>
          <th>品名<span class="required-mark">*</span></th>
          <th>品牌</th>
          <th>规格型号<span class="required-mark">*</span></th>
          <th>单位<span class="required-mark">*</span></th>
          <th>申购数量<span class="required-mark">*</span></th>
          <th>月消耗数量<span class="required-mark">*</span></th>
          <th>参考单价<span class="required-mark">*</span></th>
          <th>备注</th>
          <th class="action-column">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(line, index) in modelValue" :key="line.key">
          <td class="sequence-cell">{{ index + 1 }}</td>
          <td>
            <a-input
              :disabled="disabled"
              :status="errorAt(index, 'name') ? 'error' : undefined"
              :value="line.name"
              placeholder="物资品名"
              @update:value="(value: string) => updateLine(index, { name: value })"
            />
            <small v-if="errorAt(index, 'name')" class="field-error">{{
              errorAt(index, 'name')
            }}</small>
          </td>
          <td>
            <a-input
              :disabled="disabled"
              :value="line.brand"
              placeholder="选填"
              @update:value="(value: string) => updateLine(index, { brand: value })"
            />
          </td>
          <td>
            <a-input
              :disabled="disabled"
              :status="errorAt(index, 'specification') ? 'error' : undefined"
              :value="line.specification"
              placeholder="规格 / 型号"
              @update:value="(value: string) => updateLine(index, { specification: value })"
            />
            <small v-if="errorAt(index, 'specification')" class="field-error">
              {{ errorAt(index, 'specification') }}
            </small>
          </td>
          <td>
            <a-input
              :disabled="disabled"
              :status="errorAt(index, 'unit') ? 'error' : undefined"
              :value="line.unit"
              placeholder="件 / 箱"
              @update:value="(value: string) => updateLine(index, { unit: value })"
            />
            <small v-if="errorAt(index, 'unit')" class="field-error">{{
              errorAt(index, 'unit')
            }}</small>
          </td>
          <td>
            <a-input-number
              :disabled="disabled"
              :min="0"
              :precision="2"
              :status="errorAt(index, 'requestedQuantity') ? 'error' : undefined"
              :value="line.requestedQuantity"
              class="number-control"
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
            <a-input-number
              :disabled="disabled"
              :min="0"
              :precision="2"
              :status="errorAt(index, 'monthlyConsumption') ? 'error' : undefined"
              :value="line.monthlyConsumption"
              class="number-control"
              placeholder="0.00"
              @update:value="
                (value: unknown) => updateLine(index, { monthlyConsumption: numberValue(value) })
              "
            />
            <small v-if="errorAt(index, 'monthlyConsumption')" class="field-error">
              {{ errorAt(index, 'monthlyConsumption') }}
            </small>
          </td>
          <td>
            <MoneyInput
              :disabled="disabled"
              :model-value="line.referenceUnitPriceCents"
              aria-label="参考单价"
              @update:model-value="(value) => updateLine(index, { referenceUnitPriceCents: value })"
            />
            <small v-if="errorAt(index, 'referenceUnitPriceCents')" class="field-error">
              {{ errorAt(index, 'referenceUnitPriceCents') }}
            </small>
          </td>
          <td>
            <a-input
              :disabled="disabled"
              :value="line.remark"
              placeholder="选填"
              @update:value="(value: string) => updateLine(index, { remark: value })"
            />
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

  <div class="purchase-cards">
    <article v-for="(line, index) in modelValue" :key="line.key" class="line-card">
      <header>
        <strong>申购明细 {{ index + 1 }}</strong>
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
      <div class="mobile-field-grid">
        <label>
          <span>品名 <b>*</b></span>
          <a-input
            :disabled="disabled"
            :status="errorAt(index, 'name') ? 'error' : undefined"
            :value="line.name"
            @update:value="(value: string) => updateLine(index, { name: value })"
          />
          <small v-if="errorAt(index, 'name')" class="field-error">{{
            errorAt(index, 'name')
          }}</small>
        </label>
        <label>
          <span>品牌</span>
          <a-input
            :disabled="disabled"
            :value="line.brand"
            @update:value="(value: string) => updateLine(index, { brand: value })"
          />
        </label>
        <label class="mobile-field-full">
          <span>规格型号 <b>*</b></span>
          <a-input
            :disabled="disabled"
            :status="errorAt(index, 'specification') ? 'error' : undefined"
            :value="line.specification"
            @update:value="(value: string) => updateLine(index, { specification: value })"
          />
          <small v-if="errorAt(index, 'specification')" class="field-error">
            {{ errorAt(index, 'specification') }}
          </small>
        </label>
        <label>
          <span>单位 <b>*</b></span>
          <a-input
            :disabled="disabled"
            :status="errorAt(index, 'unit') ? 'error' : undefined"
            :value="line.unit"
            @update:value="(value: string) => updateLine(index, { unit: value })"
          />
          <small v-if="errorAt(index, 'unit')" class="field-error">{{
            errorAt(index, 'unit')
          }}</small>
        </label>
        <label>
          <span>申购数量 <b>*</b></span>
          <a-input-number
            :disabled="disabled"
            :min="0"
            :precision="2"
            :status="errorAt(index, 'requestedQuantity') ? 'error' : undefined"
            :value="line.requestedQuantity"
            class="number-control"
            @update:value="
              (value: unknown) => updateLine(index, { requestedQuantity: numberValue(value) })
            "
          />
          <small v-if="errorAt(index, 'requestedQuantity')" class="field-error">
            {{ errorAt(index, 'requestedQuantity') }}
          </small>
        </label>
        <label>
          <span>月消耗数量 <b>*</b></span>
          <a-input-number
            :disabled="disabled"
            :min="0"
            :precision="2"
            :status="errorAt(index, 'monthlyConsumption') ? 'error' : undefined"
            :value="line.monthlyConsumption"
            class="number-control"
            @update:value="
              (value: unknown) => updateLine(index, { monthlyConsumption: numberValue(value) })
            "
          />
          <small v-if="errorAt(index, 'monthlyConsumption')" class="field-error">
            {{ errorAt(index, 'monthlyConsumption') }}
          </small>
        </label>
        <label class="mobile-field-full">
          <span>参考单价 <b>*</b></span>
          <MoneyInput
            :disabled="disabled"
            :model-value="line.referenceUnitPriceCents"
            aria-label="参考单价"
            @update:model-value="(value) => updateLine(index, { referenceUnitPriceCents: value })"
          />
          <small v-if="errorAt(index, 'referenceUnitPriceCents')" class="field-error">
            {{ errorAt(index, 'referenceUnitPriceCents') }}
          </small>
        </label>
        <label class="mobile-field-full">
          <span>备注</span>
          <a-textarea
            :disabled="disabled"
            :rows="2"
            :value="line.remark"
            @update:value="(value: string) => updateLine(index, { remark: value })"
          />
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

.purchase-table-wrap {
  border: 1px solid #d8dee9;
  border-radius: 6px;
  overflow-x: auto;
}

.purchase-table {
  border-collapse: collapse;
  min-width: 1360px;
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

td {
  border-top: 1px solid #e5e9f0;
  padding: 10px 8px;
  vertical-align: top;
}

th:nth-child(2),
th:nth-child(4),
th:nth-child(9) {
  width: 170px;
}

th:nth-child(3) {
  width: 130px;
}

th:nth-child(5) {
  width: 90px;
}

th:nth-child(6),
th:nth-child(7) {
  width: 125px;
}

th:nth-child(8) {
  width: 180px;
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

.required-mark,
.mobile-field-grid b {
  color: #cf1322;
  font-weight: 400;
  margin-left: 2px;
}

.number-control {
  width: 100%;
}

.field-error {
  color: #cf1322;
  display: block;
  font-size: 12px;
  line-height: 1.35;
  margin-top: 4px;
}

.purchase-cards {
  display: none;
}

@media (max-width: 900px) {
  .purchase-table-wrap {
    display: none;
  }

  .purchase-cards {
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

  .mobile-field-grid {
    display: grid;
    gap: 14px 10px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mobile-field-grid label {
    min-width: 0;
  }

  .mobile-field-grid label > span {
    color: #475569;
    display: block;
    font-size: 13px;
    margin-bottom: 6px;
  }

  .mobile-field-full {
    grid-column: 1 / -1;
  }
}

@media (max-width: 520px) {
  .mobile-field-grid {
    grid-template-columns: 1fr;
  }

  .mobile-field-full {
    grid-column: auto;
  }
}
</style>
