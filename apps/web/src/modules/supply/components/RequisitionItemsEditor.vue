<script setup lang="ts">
import { computed } from 'vue';
import { useLayoutMode } from '../../../ui/useLayoutMode';
import { createRequisitionLine, fieldKey } from '../domain/supply-form';
import type { FieldErrors, MaterialItem, RequisitionLineForm } from '../types';

const props = defineProps<{
  modelValue: RequisitionLineForm[];
  materials: MaterialItem[];
  errors: FieldErrors;
  disabled?: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: RequisitionLineForm[]] }>();
const { isCompact } = useLayoutMode();
const materialMap = computed(() => new Map(props.materials.map((item) => [item.id, item])));
function materialAt(index: number): MaterialItem | undefined {
  return materialMap.value.get(props.modelValue[index]?.materialItemId ?? '');
}
function addLine(): void {
  if (!props.disabled) emit('update:modelValue', [...props.modelValue, createRequisitionLine()]);
}
function removeLine(index: number): void {
  if (props.disabled || props.modelValue.length <= 1) return;
  emit('update:modelValue', props.modelValue.filter((_, lineIndex) => lineIndex !== index));
}
function updateLine(index: number, patch: Partial<RequisitionLineForm>): void {
  if (props.disabled) return;
  emit('update:modelValue', props.modelValue.map((line, lineIndex) =>
    lineIndex === index ? { ...line, ...patch } : line,
  ));
}
function errorAt(index: number, field: string): string | undefined {
  return props.errors[fieldKey(index, field)];
}
function selectedElsewhere(materialId: string, currentIndex: number): boolean {
  return props.modelValue.some((line, index) => index !== currentIndex && line.materialItemId === materialId);
}
function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
</script>

<template>
  <div class="requisition-editor">
    <div class="editor-heading ui-toolbar">
      <div><strong>{{ modelValue.length }} 项领用物资</strong><p class="ui-text-muted">库存信息取自物资目录。</p></div>
      <el-button :disabled="disabled" @click="addLine">添加物资</el-button>
    </div>
    <el-alert v-if="errors.items" :title="errors.items" type="error" show-icon :closable="false" />

    <el-form v-if="!isCompact" class="desktop-editor" label-position="top" :disabled="disabled">
      <el-table :data="modelValue" row-key="key" table-layout="fixed" :scrollbar-always-on="true">
        <el-table-column type="index" label="#" width="56" />
        <el-table-column label="库存物资 *" width="300">
          <template #default="{ row, $index }">
            <el-form-item :error="errorAt($index, 'materialItemId')">
              <el-select :model-value="row.materialItemId" :aria-label="`第 ${$index + 1} 项库存物资`" filterable placeholder="按编号、品名或规格搜索" @update:model-value="(value: string) => updateLine($index, { materialItemId: value })">
                <el-option v-for="material in materials" :key="material.id" :label="`${material.code} · ${material.name} · ${material.specification}`" :value="material.id" :disabled="!material.active || selectedElsewhere(material.id, $index)" />
              </el-select>
            </el-form-item>
          </template>
        </el-table-column>
        <el-table-column label="货物编号" width="160"><template #default="{ $index }">{{ materialAt($index)?.code ?? '-' }}</template></el-table-column>
        <el-table-column label="品名" width="180"><template #default="{ $index }">{{ materialAt($index)?.name ?? '-' }}</template></el-table-column>
        <el-table-column label="规格" width="200"><template #default="{ $index }">{{ materialAt($index)?.specification ?? '-' }}</template></el-table-column>
        <el-table-column label="单位" width="90"><template #default="{ $index }">{{ materialAt($index)?.unit ?? '-' }}</template></el-table-column>
        <el-table-column label="可用库存" width="130"><template #default="{ $index }">{{ materialAt($index)?.availableQuantity ?? '-' }}</template></el-table-column>
        <el-table-column label="请领数量 *" width="160">
          <template #default="{ row, $index }">
            <el-form-item :error="errorAt($index, 'requestedQuantity')">
              <el-input-number :model-value="row.requestedQuantity" :aria-label="`第 ${$index + 1} 项请领数量`" :min="0" :precision="2" :controls="false" @update:model-value="(value: unknown) => updateLine($index, { requestedQuantity: numberValue(value) })" />
            </el-form-item>
          </template>
        </el-table-column>
        <el-table-column label="用途 *" width="280">
          <template #default="{ row, $index }">
            <el-form-item :error="errorAt($index, 'purpose')">
              <el-input :model-value="row.purpose" :aria-label="`第 ${$index + 1} 项用途`" :maxlength="500" placeholder="说明领用用途" @update:model-value="(value: string) => updateLine($index, { purpose: value })" />
            </el-form-item>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="88" fixed="right"><template #default="{ $index }"><el-button text type="danger" :aria-label="`删除第 ${$index + 1} 项`" :disabled="disabled || modelValue.length <= 1" @click="removeLine($index)">删除</el-button></template></el-table-column>
      </el-table>
      <p class="scroll-hint ui-text-muted">横向滚动查看全部字段，操作列固定在右侧。</p>
    </el-form>

    <div v-else class="item-cards">
      <article v-for="(line, index) in modelValue" :key="line.key" class="item-card">
        <header><div><span class="ui-text-muted">领用物资 {{ String(index + 1).padStart(2, '0') }}</span><h3>{{ materialAt(index)?.name || '选择库存物资' }}</h3></div><el-button text type="danger" :disabled="disabled || modelValue.length <= 1" :aria-label="`删除第 ${index + 1} 项`" @click="removeLine(index)">删除</el-button></header>
        <el-form label-position="top" :disabled="disabled">
          <el-form-item label="库存物资" required :error="errorAt(index, 'materialItemId')">
            <el-select :model-value="line.materialItemId" filterable placeholder="按编号、品名或规格搜索" @update:model-value="(value: string) => updateLine(index, { materialItemId: value })">
              <el-option v-for="material in materials" :key="material.id" :label="`${material.code} · ${material.name} · ${material.specification}`" :value="material.id" :disabled="!material.active || selectedElsewhere(material.id, index)" />
            </el-select>
          </el-form-item>
          <dl class="material-facts">
            <div><dt>货物编号</dt><dd>{{ materialAt(index)?.code ?? '-' }}</dd></div>
            <div><dt>品名</dt><dd>{{ materialAt(index)?.name ?? '-' }}</dd></div>
            <div><dt>规格</dt><dd>{{ materialAt(index)?.specification ?? '-' }}</dd></div>
            <div><dt>单位</dt><dd>{{ materialAt(index)?.unit ?? '-' }}</dd></div>
            <div><dt>可用库存</dt><dd>{{ materialAt(index)?.availableQuantity ?? '-' }}</dd></div>
          </dl>
          <el-form-item label="请领数量" required :error="errorAt(index, 'requestedQuantity')"><el-input-number :model-value="line.requestedQuantity" :min="0" :precision="2" controls-position="right" @update:model-value="(value: unknown) => updateLine(index, { requestedQuantity: numberValue(value) })" /></el-form-item>
          <el-form-item label="用途" required :error="errorAt(index, 'purpose')"><el-input :model-value="line.purpose" type="textarea" :rows="3" :maxlength="500" show-word-limit @update:model-value="(value: string) => updateLine(index, { purpose: value })" /></el-form-item>
        </el-form>
      </article>
    </div>
  </div>
</template>

<style scoped>
.requisition-editor, .desktop-editor { min-width: 0; max-width: 100%; }
.requisition-editor { display: grid; gap: 16px; }
.editor-heading { justify-content: space-between; align-items: center; }
.editor-heading p { margin: 6px 0 0; font-size: 13px; }
.desktop-editor { overflow: hidden; border: 1px solid var(--color-border); border-radius: var(--radius-md); }
.desktop-editor :deep(.el-form-item) { margin: 6px 0 20px; }
.desktop-editor :deep(.el-form-item__error) { position: static; padding-top: 6px; }
:deep(.el-input-number), :deep(.el-select) { width: 100%; }
.scroll-hint { margin: 12px 16px; font-size: 12px; }
.item-cards { display: grid; gap: 16px; min-width: 0; }
.item-card { padding: 20px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: #fff; min-width: 0; }
.item-card header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 20px; }
.item-card header > div { min-width: 0; }
.item-card h3 { margin: 4px 0 0; font-size: 17px; overflow-wrap: anywhere; }
.material-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 0 0 20px; padding: 14px; background: var(--color-surface); border-radius: 6px; }
.material-facts div { min-width: 0; }
.material-facts dt { font-size: 12px; color: var(--color-text-secondary); }
.material-facts dd { margin: 4px 0 0; overflow-wrap: anywhere; }
</style>
