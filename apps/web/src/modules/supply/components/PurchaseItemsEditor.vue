<script setup lang="ts">
import { useLayoutMode } from '../../../ui/useLayoutMode';
import MoneyInput from '../../../shared/components/MoneyInput.vue';
import { formatMoney } from '../../../shared/format';
import { createPurchaseLine, fieldKey } from '../domain/supply-form';
import type { FieldErrors, PurchaseLineForm } from '../types';

const props = defineProps<{
  modelValue: PurchaseLineForm[];
  errors: FieldErrors;
  disabled?: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: PurchaseLineForm[]] }>();
const { isCompact } = useLayoutMode();
const textFields = [
  { key: 'name', label: '品名', width: 190, required: true, placeholder: '物资名称' },
  { key: 'brand', label: '品牌', width: 150, required: false, placeholder: '选填' },
  { key: 'specification', label: '规格型号', width: 210, required: true, placeholder: '规格 / 型号' },
  { key: 'unit', label: '单位', width: 110, required: true, placeholder: '件 / 箱' },
] as const;
const quantityFields = [
  { key: 'requestedQuantity', label: '申购数量' },
  { key: 'monthlyConsumption', label: '月消耗数量' },
] as const;

function addLine(): void {
  if (!props.disabled) emit('update:modelValue', [...props.modelValue, createPurchaseLine()]);
}
function removeLine(index: number): void {
  if (props.disabled || props.modelValue.length <= 1) return;
  emit('update:modelValue', props.modelValue.filter((_, lineIndex) => lineIndex !== index));
}
function updateLine(index: number, patch: Partial<PurchaseLineForm>): void {
  if (props.disabled) return;
  emit('update:modelValue', props.modelValue.map((line, lineIndex) =>
    lineIndex === index ? { ...line, ...patch } : line,
  ));
}
function errorAt(index: number, field: string): string | undefined {
  return props.errors[fieldKey(index, field)];
}
function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function lineAmount(line: PurchaseLineForm): string {
  return formatMoney(Math.round((line.requestedQuantity ?? 0) * (line.referenceUnitPriceCents ?? 0)));
}
</script>

<template>
  <div class="purchase-editor">
    <div class="editor-heading ui-toolbar">
      <div>
        <strong>{{ modelValue.length }} 项申购物资</strong>
        <p class="ui-text-muted">填写数量与参考单价，自动计算含税金额。</p>
      </div>
      <el-button :disabled="disabled" @click="addLine">添加物资</el-button>
    </div>
    <el-alert v-if="errors.items" :title="errors.items" type="error" show-icon :closable="false" />

    <el-form v-if="!isCompact" class="desktop-editor" label-position="top" :disabled="disabled">
      <el-table :data="modelValue" row-key="key" :scrollbar-always-on="true" table-layout="fixed">
        <el-table-column type="index" label="#" width="56" />
        <el-table-column v-for="field in textFields" :key="field.key" :label="`${field.label}${field.required ? ' *' : ''}`" :width="field.width">
          <template #default="{ row, $index }">
            <el-form-item :error="errorAt($index, field.key)">
              <el-input :model-value="row[field.key]" :aria-label="`第 ${$index + 1} 项${field.label}`" :placeholder="field.placeholder" @update:model-value="(value: string) => updateLine($index, { [field.key]: value })" />
            </el-form-item>
          </template>
        </el-table-column>
        <el-table-column v-for="field in quantityFields" :key="field.key" :label="`${field.label} *`" width="160">
          <template #default="{ row, $index }">
            <el-form-item :error="errorAt($index, field.key)">
              <el-input-number :model-value="row[field.key]" :aria-label="`第 ${$index + 1} 项${field.label}`" :min="0" :precision="2" :controls="false" @update:model-value="(value: unknown) => updateLine($index, { [field.key]: numberValue(value) })" />
            </el-form-item>
          </template>
        </el-table-column>
        <el-table-column label="参考单价 *" width="200">
          <template #default="{ row, $index }">
            <el-form-item :error="errorAt($index, 'referenceUnitPriceCents')">
              <MoneyInput :disabled="disabled" :model-value="row.referenceUnitPriceCents" :aria-label="`第 ${$index + 1} 项参考单价`" @update:model-value="(value) => updateLine($index, { referenceUnitPriceCents: value })" />
            </el-form-item>
          </template>
        </el-table-column>
        <el-table-column label="含税金额" width="150" align="right">
          <template #default="{ row }"><strong>{{ lineAmount(row) }}</strong></template>
        </el-table-column>
        <el-table-column label="备注" width="240">
          <template #default="{ row, $index }">
            <el-input :model-value="row.remark" :aria-label="`第 ${$index + 1} 项备注`" placeholder="选填" @update:model-value="(value: string) => updateLine($index, { remark: value })" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="88" fixed="right">
          <template #default="{ $index }">
            <el-button text type="danger" :aria-label="`删除第 ${$index + 1} 项`" :disabled="disabled || modelValue.length <= 1" @click="removeLine($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <p class="scroll-hint ui-text-muted">横向滚动查看全部字段，操作列固定在右侧。</p>
    </el-form>

    <div v-else class="item-cards">
      <article v-for="(line, index) in modelValue" :key="line.key" class="item-card">
        <header>
          <div><span class="ui-text-muted">物资 {{ String(index + 1).padStart(2, '0') }}</span><h3>{{ line.name || '待填写物资' }}</h3></div>
          <el-button text type="danger" :aria-label="`删除第 ${index + 1} 项`" :disabled="disabled || modelValue.length <= 1" @click="removeLine(index)">删除</el-button>
        </header>
        <el-form label-position="top" :disabled="disabled">
          <el-form-item v-for="field in textFields" :key="field.key" :label="field.label" :required="field.required" :error="errorAt(index, field.key)">
            <el-input :model-value="line[field.key]" :placeholder="field.placeholder" @update:model-value="(value: string) => updateLine(index, { [field.key]: value })" />
          </el-form-item>
          <el-form-item v-for="field in quantityFields" :key="field.key" :label="field.label" required :error="errorAt(index, field.key)">
            <el-input-number :model-value="line[field.key]" :min="0" :precision="2" controls-position="right" @update:model-value="(value: unknown) => updateLine(index, { [field.key]: numberValue(value) })" />
          </el-form-item>
          <el-form-item label="参考单价" required :error="errorAt(index, 'referenceUnitPriceCents')">
            <MoneyInput :disabled="disabled" :model-value="line.referenceUnitPriceCents" aria-label="参考单价" @update:model-value="(value) => updateLine(index, { referenceUnitPriceCents: value })" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input :model-value="line.remark" type="textarea" :rows="2" placeholder="补充说明（选填）" @update:model-value="(value: string) => updateLine(index, { remark: value })" />
          </el-form-item>
        </el-form>
        <footer><span>本项含税金额</span><strong>{{ lineAmount(line) }}</strong></footer>
      </article>
    </div>
  </div>
</template>

<style scoped>
.purchase-editor, .desktop-editor { min-width: 0; max-width: 100%; }
.purchase-editor { display: grid; gap: 16px; }
.editor-heading { justify-content: space-between; align-items: center; }
.editor-heading p { margin: 6px 0 0; font-size: 13px; }
.desktop-editor { overflow: hidden; border: 1px solid var(--color-border); border-radius: var(--radius-md); }
.desktop-editor :deep(.el-form-item) { margin: 6px 0 20px; }
.desktop-editor :deep(.el-form-item__error) { position: static; padding-top: 6px; }
:deep(.el-input-number) { width: 100%; }
.scroll-hint { margin: 12px 16px; font-size: 12px; }
.item-cards { display: grid; gap: 16px; min-width: 0; }
.item-card { min-width: 0; padding: 20px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: #fff; }
.item-card header, .item-card footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.item-card header { margin-bottom: 20px; }
.item-card header > div { min-width: 0; }
.item-card h3 { margin: 4px 0 0; font-size: 17px; overflow-wrap: anywhere; }
.item-card footer { padding-top: 16px; border-top: 1px solid var(--color-border); }
.item-card footer strong { font-size: 20px; }
</style>
