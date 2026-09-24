<script setup lang="ts">
import { ArrowDown, ArrowUp, Delete, Plus } from '@element-plus/icons-vue';
import {
  ElButton,
  ElButtonGroup,
  ElCheckbox,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElInputNumber,
  ElOption,
  ElRadioButton,
  ElRadioGroup,
  ElSelect,
  ElTabPane,
  ElTabs,
} from 'element-plus';
import { computed, ref } from 'vue';
import { useLayoutMode } from '../../../../ui/useLayoutMode';
import type { FormFieldModel, FormSchema, PrintSchema } from '../../types/designer';
import { createTableColumn } from '../../utils/form';

const props = defineProps<{
  field: FormFieldModel | null;
  schema: FormSchema;
  printSchema: PrintSchema;
  readonly: boolean;
}>();
const emit = defineEmits<{
  updateField: [field: FormFieldModel];
  updateSchema: [schema: FormSchema];
  updatePrintSchema: [schema: PrintSchema];
  remove: [];
  move: [direction: -1 | 1];
}>();
const { isCompact } = useLayoutMode();
const activeTab = ref('field');

const optionsText = computed({
  get: () => props.field?.options?.join('\n') ?? '',
  set: (value: string) =>
    updateField({
      options: value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    }),
});

function updateField(patch: Partial<FormFieldModel>): void {
  if (props.field) emit('updateField', { ...props.field, ...patch });
}

function updateSchema(patch: Partial<FormSchema>): void {
  emit('updateSchema', { ...props.schema, ...patch });
}

function updatePrint(patch: Partial<PrintSchema>): void {
  emit('updatePrintSchema', { ...props.printSchema, ...patch });
}

function updateMargin(value: number): void {
  updatePrint({
    paper: {
      ...props.printSchema.paper,
      marginMm: { top: value, right: value, bottom: value, left: value },
    },
  });
}

function updateOptions(patch: Partial<PrintSchema['options']>): void {
  updatePrint({ options: { ...props.printSchema.options, ...patch } });
}

function updateColumn(index: number, patch: Record<string, string | number>): void {
  if (!props.field) return;
  const columns = (props.field.columns ?? []).map((column, columnIndex) =>
    columnIndex === index ? { ...column, ...patch } : column,
  );
  updateField({ columns });
}

function addColumn(): void {
  updateField({ columns: [...(props.field?.columns ?? []), createTableColumn()] });
}

function removeColumn(index: number): void {
  updateField({
    columns: (props.field?.columns ?? []).filter((_, columnIndex) => columnIndex !== index),
  });
}
</script>

<template>
  <aside class="form-inspector" :data-compact="isCompact">
    <ElTabs v-model="activeTab">
      <ElTabPane label="字段属性" name="field">
        <template v-if="field">
          <div class="form-inspector__actions">
            <ElButtonGroup>
              <ElButton :disabled="readonly" title="上移字段" @click="emit('move', -1)"
                ><ElIcon><ArrowUp /></ElIcon
              ></ElButton>
              <ElButton :disabled="readonly" title="下移字段" @click="emit('move', 1)"
                ><ElIcon><ArrowDown /></ElIcon
              ></ElButton>
            </ElButtonGroup>
            <ElButton :disabled="readonly" plain type="danger" @click="emit('remove')"
              ><ElIcon><Delete /></ElIcon>删除</ElButton
            >
          </div>
          <ElForm label-position="top" :disabled="readonly">
            <ElFormItem label="字段名称"
              ><ElInput
                :model-value="field.label"
                maxlength="40"
                @update:model-value="updateField({ label: $event })"
            /></ElFormItem>
            <ElFormItem label="字段标识"
              ><ElInput
                :model-value="field.key"
                maxlength="60"
                @update:model-value="updateField({ key: $event })"
            /></ElFormItem>
            <ElFormItem label="占用宽度">
              <ElRadioGroup
                :model-value="field.span"
                @update:model-value="updateField({ span: $event as 1 | 2 })"
              >
                <ElRadioButton :value="1">半行</ElRadioButton
                ><ElRadioButton :value="2">整行</ElRadioButton>
              </ElRadioGroup>
            </ElFormItem>
            <ElFormItem label="填写提示"
              ><ElInput
                :model-value="field.placeholder"
                maxlength="80"
                @update:model-value="updateField({ placeholder: $event })"
            /></ElFormItem>
            <ElFormItem
              ><ElCheckbox
                :model-value="field.required"
                @update:model-value="updateField({ required: Boolean($event) })"
                >必填字段</ElCheckbox
              ></ElFormItem
            >
            <ElFormItem v-if="field.type === 'select'" label="选项（每行一项）"
              ><ElInput v-model="optionsText" :rows="5" type="textarea"
            /></ElFormItem>
            <div v-if="field.type === 'table'" class="table-column-editor">
              <div class="panel-subheading">
                <div>
                  <strong>明细列</strong>
                  <small>配置打印表格的列名和宽度</small>
                </div>
                <ElButton :disabled="readonly" size="small" @click="addColumn">
                  <ElIcon><Plus /></ElIcon>新增列
                </ElButton>
              </div>
              <div
                v-for="(column, index) in field.columns"
                :key="column.id"
                class="table-column-editor__row"
              >
                <ElInput
                  :model-value="column.label"
                  placeholder="列名"
                  @update:model-value="updateColumn(index, { label: $event })"
                />
                <ElInputNumber
                  :min="60"
                  :model-value="column.width"
                  :step="10"
                  controls-position="right"
                  @update:model-value="updateColumn(index, { width: $event ?? 120 })"
                />
                <ElButton circle text type="danger" @click="removeColumn(index)"
                  ><ElIcon><Delete /></ElIcon
                ></ElButton>
              </div>
            </div>
          </ElForm>
        </template>
        <div v-else class="empty-hint">在 A4 纸张中选择字段后编辑属性</div>
      </ElTabPane>
      <ElTabPane label="纸张设置" name="paper">
        <ElForm label-position="top" :disabled="readonly">
          <ElFormItem label="表单标题"
            ><ElInput
              :model-value="schema.title"
              maxlength="80"
              @update:model-value="updateSchema({ title: $event })"
          /></ElFormItem>
          <ElFormItem label="副标题"
            ><ElInput
              :model-value="schema.subtitle"
              maxlength="100"
              @update:model-value="updateSchema({ subtitle: $event })"
          /></ElFormItem>
          <ElFormItem label="纸张规格"
            ><ElSelect model-value="A4" disabled
              ><ElOption label="A4（210 × 297 mm）" value="A4" /></ElSelect
          ></ElFormItem>
          <ElFormItem label="页边距（mm）"
            ><ElInputNumber
              :max="25"
              :min="8"
              :model-value="printSchema.paper.marginMm.top"
              @update:model-value="updateMargin($event ?? 14)"
          /></ElFormItem>
          <ElFormItem label="表格线宽"
            ><ElInputNumber
              :max="2"
              :min="0.5"
              :model-value="printSchema.options.gridLineWidth"
              :step="0.5"
              @update:model-value="updateOptions({ gridLineWidth: $event ?? 1 })"
          /></ElFormItem>
          <ElFormItem
            ><ElCheckbox
              :model-value="printSchema.options.showDocumentNumber"
              @update:model-value="updateOptions({ showDocumentNumber: Boolean($event) })"
              >打印单据编号</ElCheckbox
            ></ElFormItem
          >
          <ElFormItem
            ><ElCheckbox
              :model-value="printSchema.options.showApprovalOpinions"
              @update:model-value="updateOptions({ showApprovalOpinions: Boolean($event) })"
              >打印审批意见</ElCheckbox
            ></ElFormItem
          >
        </ElForm>
      </ElTabPane>
    </ElTabs>
  </aside>
</template>

<style scoped>
.form-inspector {
  min-width: 0;
  padding: 0 16px 20px;
  overflow: auto;
  background: var(--color-canvas);
  border-left: 1px solid var(--color-border);
}
.form-inspector :deep(.el-tabs__header) {
  position: sticky;
  z-index: 2;
  top: 0;
  padding-top: 8px;
  background: var(--color-canvas);
}
.form-inspector__actions {
  display: flex;
  justify-content: space-between;
  margin-bottom: 14px;
}
.form-inspector :deep(.el-select),
.form-inspector :deep(.el-input-number) {
  width: 100%;
}
.panel-subheading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: var(--space-sm);
}
.panel-subheading > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-xxs);
}
.panel-subheading strong {
  font-size: var(--font-size-title-sm);
  font-weight: 600;
}
.panel-subheading small {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-caption);
}
.table-column-editor {
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}
.table-column-editor__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 94px 32px;
  gap: 6px;
  margin-bottom: 7px;
}
.empty-hint {
  display: grid;
  min-height: 160px;
  place-content: center;
  color: var(--color-text-tertiary);
  text-align: center;
}
.form-inspector[data-compact='true'] {
  border-left: 0;
  overflow: visible;
}
html[data-layout='compact'] .table-column-editor__row {
  grid-template-columns: minmax(0, 1fr) 84px 44px;
}
</style>
