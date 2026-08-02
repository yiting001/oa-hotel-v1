<script setup lang="ts">
import {
  Calendar,
  ChatLineSquare,
  Document,
  EditPen,
  Grid,
  List,
  Paperclip,
  Tickets,
} from '@element-plus/icons-vue';
import { ElIcon } from 'element-plus';
import type { Component } from 'vue';
import type { FormFieldType } from '../../types/designer';
import { fieldCatalog } from '../../utils/form';

defineProps<{ disabled: boolean }>();
const emit = defineEmits<{
  add: [type: FormFieldType];
  dragStart: [event: DragEvent, type: FormFieldType];
}>();

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
</script>

<template>
  <aside class="form-palette no-print">
    <div class="platform-panel-heading">
      <div><strong>字段物料</strong><small>点击添加，或拖入 A4 纸张</small></div>
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
        <span
          ><strong>{{ item.label }}</strong
          ><small>{{ item.description }}</small></span
        >
      </button>
    </div>
    <div class="form-palette__note">
      <strong>打印优先</strong>
      <p>字段将以有边框的审批表格呈现，附件与审批意见也会进入正式打印页。</p>
    </div>
  </aside>
</template>
