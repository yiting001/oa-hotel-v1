<script setup lang="ts">
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ChatLineSquare,
  Delete,
  Document,
  EditPen,
  Grid,
  List,
  Paperclip,
  Tickets,
} from '@element-plus/icons-vue';
import { ElButton, ElIcon } from 'element-plus';
import { computed } from 'vue';
import type { Component } from 'vue';
import { useLayoutMode } from '../../../../ui/useLayoutMode';
import type { FormFieldModel, FormFieldType } from '../../types/designer';
import { fieldCatalog } from '../../utils/form';

const props = withDefaults(
  defineProps<{
    disabled: boolean;
    fields: FormFieldModel[];
    selectedFieldId?: string | null;
  }>(),
  { selectedFieldId: null },
);
const emit = defineEmits<{
  add: [type: FormFieldType];
  dragStart: [event: DragEvent, type: FormFieldType];
  select: [id: string];
  move: [id: string, direction: -1 | 1];
  remove: [id: string];
}>();
const { isCompact } = useLayoutMode();

const icons: Record<FormFieldType, Component> = {
  text: EditPen,
  textarea: Document,
  number: Tickets,
  date: Calendar,
  select: List,
  table: Grid,
  attachment: Paperclip,
  opinions: ChatLineSquare,
};
const typeLabels = computed<Record<string, string>>(() =>
  Object.fromEntries(fieldCatalog.map((item) => [item.type, item.label])),
);
</script>

<template>
  <aside class="form-palette" :data-compact="isCompact">
    <div class="panel-heading">
      <div class="panel-heading__copy">
        <strong>字段物料</strong>
        <small>点击添加，或拖入 A4 纸张</small>
      </div>
    </div>
    <div class="form-palette__items">
      <button
        v-for="item in fieldCatalog"
        :key="item.type"
        :disabled="disabled"
        :draggable="!disabled"
        type="button"
        @click="emit('add', item.type)"
        @dragstart="emit('dragStart', $event, item.type)"
      >
        <ElIcon><component :is="icons[item.type]" /></ElIcon>
        <span>
          <strong>{{ item.label }}</strong>
          <small>{{ item.description }}</small>
        </span>
      </button>
    </div>

    <section v-if="isCompact" class="field-list" aria-label="表单字段顺序">
      <div class="field-list__heading">
        <strong>已添加字段</strong>
        <small>{{ props.fields.length }} 个字段 · 可调整顺序</small>
      </div>
      <ol v-if="props.fields.length" class="field-list__items">
        <li
          v-for="(field, index) in props.fields"
          :key="field.id"
          class="field-list__item"
          :class="{ 'is-selected': field.id === props.selectedFieldId }"
        >
          <button class="field-list__select" type="button" @click="emit('select', field.id)">
            <span class="field-list__index">{{ index + 1 }}</span>
            <span class="field-list__copy">
              <strong>{{ field.label }}</strong>
              <small>{{ typeLabels[field.type] ?? field.type }}{{ field.required ? ' · 必填' : '' }}</small>
            </span>
          </button>
          <div class="field-list__controls">
            <ElButton
              circle
              size="small"
              text
              :disabled="disabled || index === 0"
              :aria-label="`上移字段 ${field.label}`"
              @click="emit('move', field.id, -1)"
            >
              <ElIcon><ArrowUp /></ElIcon>
            </ElButton>
            <ElButton
              circle
              size="small"
              text
              :disabled="disabled || index === props.fields.length - 1"
              :aria-label="`下移字段 ${field.label}`"
              @click="emit('move', field.id, 1)"
            >
              <ElIcon><ArrowDown /></ElIcon>
            </ElButton>
            <ElButton
              circle
              size="small"
              text
              type="danger"
              :disabled="disabled"
              :aria-label="`删除字段 ${field.label}`"
              @click="emit('remove', field.id)"
            >
              <ElIcon><Delete /></ElIcon>
            </ElButton>
          </div>
        </li>
      </ol>
      <p v-else class="ui-text-muted field-list__empty">尚未添加字段，点击上方物料开始设计。</p>
    </section>

    <div class="form-palette__note">
      <strong>打印优先</strong>
      <p>字段将以有边框的审批表格呈现，附件与审批意见也会进入正式打印页。</p>
    </div>
  </aside>
</template>

<style scoped>
.form-palette {
  min-width: 0;
  padding: 16px 12px;
  overflow: auto;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
}
.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  margin: 0 4px 12px;
}
.panel-heading__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-xxs);
}
.panel-heading strong {
  font-size: var(--font-size-title-sm);
  font-weight: 600;
}
.panel-heading small {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-caption);
}
.form-palette__items {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}
.form-palette__items button {
  display: flex;
  min-height: 82px;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 8px;
  color: var(--color-text);
  background: var(--color-canvas);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  cursor: grab;
  text-align: left;
}
.form-palette__items button:hover:not(:disabled) {
  background: var(--color-fill-hover);
  border-color: var(--color-primary);
}
.form-palette__items button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.form-palette__items .el-icon {
  flex: 0 0 auto;
  margin-top: 2px;
  color: var(--color-primary);
  font-size: 17px;
}
.form-palette__items span {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.form-palette__items strong {
  font-size: 12px;
}
.form-palette__items small {
  margin-top: 3px;
  color: var(--color-text-tertiary);
  font-size: 10px;
  line-height: 1.35;
}
.form-palette__note {
  margin-top: 14px;
  padding: 11px;
  background: var(--color-surface-3);
  border-left: 3px solid var(--color-success);
  border-radius: var(--radius-xs);
}
.form-palette__note strong {
  font-size: 12px;
}
.form-palette__note p {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: 11px;
  line-height: 1.5;
}
.field-list {
  min-width: 0;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}
.field-list__heading {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 10px;
}
.field-list__heading strong {
  font-size: var(--font-size-title-sm);
  font-weight: 600;
}
.field-list__heading small {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-caption);
}
.field-list__items {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.field-list__item {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  padding: 8px 8px 8px 12px;
  background: var(--color-canvas);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.field-list__item.is-selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}
.field-list__select {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  color: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
}
.field-list__index {
  display: grid;
  flex: 0 0 24px;
  height: 24px;
  place-items: center;
  color: var(--color-text-tertiary);
  background: var(--color-surface-3);
  border-radius: 50%;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.field-list__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}
.field-list__copy strong {
  min-width: 0;
  font-size: 14px;
  overflow-wrap: anywhere;
}
.field-list__copy small {
  color: var(--color-text-tertiary);
  font-size: 12px;
}
.field-list__controls {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 2px;
}
.field-list__empty {
  margin: 0;
  font-size: 13px;
}
.form-palette[data-compact='true'] {
  border-right: 0;
  border-bottom: 1px solid var(--color-border);
  overflow: visible;
}
</style>
