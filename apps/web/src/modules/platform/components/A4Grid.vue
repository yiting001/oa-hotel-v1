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
