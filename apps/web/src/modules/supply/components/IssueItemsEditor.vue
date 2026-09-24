<script setup lang="ts">
import { computed } from 'vue';
import { useLayoutMode } from '../../../ui/useLayoutMode';
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
const { isCompact } = useLayoutMode();
const stockMap = computed(() => new Map(props.inventory.map((item) => [item.id, item.availableQuantity])));
function updateLine(index: number, patch: Partial<IssueLineForm>): void {
  if (props.disabled) return;
  emit('update:modelValue', props.modelValue.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
}
function errorAt(index: number, field: string): string | undefined {
  return props.errors[fieldKey(index, field)];
}
function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
</script>

<template>
  <div class="issue-editor">
    <el-alert v-if="errors.items" :title="errors.items" type="error" show-icon :closable="false" />
    <el-alert v-if="errors.issuedAt" :title="errors.issuedAt" type="error" show-icon :closable="false" />
    <el-form v-if="!isCompact" class="desktop-editor" label-position="top" :disabled="disabled">
      <el-table :data="requisition.items" row-key="materialItemId" table-layout="fixed" :scrollbar-always-on="true">
        <el-table-column prop="itemCode" label="货物编号" width="155" />
        <el-table-column prop="name" label="品名" width="175" />
        <el-table-column prop="specification" label="规格" width="190" />
        <el-table-column prop="unit" label="单位" width="90" />
        <el-table-column prop="purpose" label="用途" width="220" />
        <el-table-column prop="requestedQuantity" label="请领数量" width="125" />
        <el-table-column label="可用库存" width="125"><template #default="{ row }">{{ stockMap.get(row.materialItemId) ?? '-' }}</template></el-table-column>
        <el-table-column label="实发数量 *" width="170">
          <template #default="{ row, $index }"><el-form-item :error="errorAt($index, 'issuedQuantity')"><el-input-number :model-value="modelValue[$index]?.issuedQuantity" :min="0" :max="Number(row.requestedQuantity)" :precision="2" :controls="false" :aria-label="`第 ${$index + 1} 项实发数量`" @update:model-value="(value: unknown) => updateLine($index, { issuedQuantity: numberValue(value) })" /></el-form-item></template>
        </el-table-column>
        <el-table-column label="实发时间 *" width="235" fixed="right">
          <template #default="{ $index }"><el-form-item :error="errorAt($index, 'issuedAt')"><el-input :model-value="modelValue[$index]?.issuedAt" type="datetime-local" :aria-label="`第 ${$index + 1} 项实发时间`" @update:model-value="(value: string) => updateLine($index, { issuedAt: value })" /></el-form-item></template>
        </el-table-column>
      </el-table>
      <p class="scroll-hint ui-text-muted">横向滚动核对物资信息，实发时间列固定在右侧。</p>
    </el-form>
    <div v-else class="item-cards">
      <article v-for="(item, index) in requisition.items" :key="item.materialItemId" class="item-card">
        <header><div><span class="ui-text-muted">{{ item.itemCode }}</span><h3>{{ item.name }}</h3></div><span class="ui-text-muted">{{ item.specification }} · {{ item.unit }}</span></header>
        <dl class="material-facts"><div><dt>用途</dt><dd>{{ item.purpose }}</dd></div><div><dt>请领数量</dt><dd>{{ item.requestedQuantity }}</dd></div><div><dt>可用库存</dt><dd>{{ stockMap.get(item.materialItemId) ?? '-' }}</dd></div></dl>
        <el-form label-position="top" :disabled="disabled">
          <el-form-item label="实发数量" required :error="errorAt(index, 'issuedQuantity')"><el-input-number :model-value="modelValue[index]?.issuedQuantity" :min="0" :max="Number(item.requestedQuantity)" :precision="2" controls-position="right" @update:model-value="(value: unknown) => updateLine(index, { issuedQuantity: numberValue(value) })" /></el-form-item>
          <el-form-item label="实发时间" required :error="errorAt(index, 'issuedAt')"><el-input :model-value="modelValue[index]?.issuedAt" type="datetime-local" @update:model-value="(value: string) => updateLine(index, { issuedAt: value })" /></el-form-item>
        </el-form>
      </article>
    </div>
  </div>
</template>

<style scoped>
.issue-editor { display: grid; gap: 16px; min-width: 0; max-width: 100%; }
.desktop-editor { min-width: 0; max-width: 100%; overflow: hidden; border: 1px solid var(--color-border); border-radius: var(--radius-md); }
.desktop-editor :deep(.el-form-item) { margin: 6px 0 20px; }
.desktop-editor :deep(.el-form-item__error) { position: static; padding-top: 6px; }
:deep(.el-input-number) { width: 100%; }
.scroll-hint { margin: 12px 16px; font-size: 12px; }
.item-cards { display: grid; gap: 16px; min-width: 0; }
.item-card { padding: 20px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: #fff; min-width: 0; }
.item-card header { display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.item-card header > div { min-width: 0; }
.item-card h3 { margin: 4px 0 0; font-size: 17px; overflow-wrap: anywhere; }
.material-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 14px; background: var(--color-surface); border-radius: 6px; margin: 16px 0; }
.material-facts div { min-width: 0; }
.material-facts dt { font-size: 12px; color: var(--color-text-secondary); }
.material-facts dd { margin: 4px 0 0; overflow-wrap: anywhere; }
</style>
