<script setup lang="ts">
import type { FormFieldModel } from '../types/designer';
import FormFieldPreview from './FormFieldPreview.vue';

defineProps<{
  fields: FormFieldModel[];
  selectedFieldId: string | null;
  editable: boolean;
}>();

const emit = defineEmits<{
  select: [id: string];
  fieldDragStart: [event: DragEvent, id: string];
  fieldDrop: [event: DragEvent, targetId: string | null];
}>();
</script>

<template>
  <div class="a4-grid" @dragover.prevent @drop.stop="emit('fieldDrop', $event, null)">
    <button
      v-for="field in fields"
      :key="field.id"
      class="a4-grid__field"
      :class="[
        `a4-grid__field--span-${field.span}`,
        { 'is-selected': field.id === selectedFieldId },
      ]"
      :draggable="editable"
      type="button"
      @click="emit('select', field.id)"
      @dragover.prevent
      @dragstart="emit('fieldDragStart', $event, field.id)"
      @drop.stop="emit('fieldDrop', $event, field.id)"
    >
      <span class="a4-grid__label">
        {{ field.label }}
        <i v-if="field.required">*</i>
      </span>
      <FormFieldPreview :field="field" />
    </button>
    <div v-if="fields.length === 0" class="a4-grid__empty">从左侧拖入字段，开始制作审批表单</div>
  </div>
</template>

<style scoped>
.a4-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-right: var(--a4-grid-line) solid #222;
  border-bottom: var(--a4-grid-line) solid #222;
}
.a4-grid__field {
  display: grid;
  min-width: 0;
  min-height: 13mm;
  grid-template-columns: 30mm minmax(0, 1fr);
  padding: 0;
  color: #111;
  background: #fff;
  border: 0;
  border-top: var(--a4-grid-line) solid #222;
  border-left: var(--a4-grid-line) solid #222;
  border-radius: 0;
  cursor: pointer;
  font-family: inherit;
  font-size: 10pt;
  text-align: left;
}
.a4-grid__field--span-2 { grid-column: 1 / -1; }
.a4-grid__field.is-selected { position: relative; z-index: 1; outline: 2px solid var(--color-primary); outline-offset: -2px; }
.a4-grid__label {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  padding: 2mm;
  background: #f4f4f4;
  border-right: var(--a4-grid-line) solid #222;
  font-weight: 500;
  text-align: center;
  overflow-wrap: anywhere;
}
.a4-grid__label i { margin-left: 1mm; color: #a51d1d; font-style: normal; }
.a4-grid__empty {
  display: flex;
  min-height: 90mm;
  grid-column: 1 / -1;
  align-items: center;
  justify-content: center;
  color: #777;
  border-top: var(--a4-grid-line) solid #222;
  border-left: var(--a4-grid-line) solid #222;
  font-size: 10pt;
}

@media print {
  .a4-grid__field { break-inside: avoid; outline: 0 !important; }
}
</style>
