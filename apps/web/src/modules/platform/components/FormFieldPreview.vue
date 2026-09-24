<script setup lang="ts">
import type { FormFieldModel } from '../types/designer';

defineProps<{ field: FormFieldModel }>();
</script>

<template>
  <div class="a4-field-preview" :class="`a4-field-preview--${field.type}`">
    <template v-if="field.type === 'table'">
      <table>
        <thead>
          <tr>
            <th v-for="column in field.columns" :key="column.id">{{ column.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in 3" :key="row">
            <td v-for="column in field.columns" :key="column.id">&nbsp;</td>
          </tr>
        </tbody>
      </table>
    </template>
    <template v-else-if="field.type === 'attachment'">
      <div class="a4-attachment-line">附件名称 / 文件编号 / 页数</div>
      <div class="a4-attachment-line">&nbsp;</div>
    </template>
    <template v-else-if="field.type === 'opinions'">
      <div class="a4-opinion-grid">
        <span>审批意见：</span>
        <small>签名：____________ 日期：____年__月__日</small>
      </div>
    </template>
    <template v-else-if="field.type === 'select'">
      <span class="a4-placeholder">{{ field.options?.join(' / ') || field.placeholder }}</span>
    </template>
    <template v-else>
      <span class="a4-placeholder">{{ field.placeholder || '请填写' }}</span>
    </template>
  </div>
</template>

<style scoped>
.a4-field-preview { min-width: 0; min-height: 12mm; padding: 3mm; }
.a4-field-preview--textarea { min-height: 30mm; }
.a4-placeholder { color: #777; font-size: 9pt; }
.a4-field-preview table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8.5pt; }
.a4-field-preview th,
.a4-field-preview td { height: 8mm; padding: 1mm; border: 0.5px solid #444; text-align: center; }
.a4-attachment-line { min-height: 8mm; padding: 1mm 0; color: #555; border-bottom: 0.5px solid #888; font-size: 9pt; }
.a4-opinion-grid { display: flex; min-height: 27mm; flex-direction: column; justify-content: space-between; }
.a4-opinion-grid small { align-self: flex-end; font-size: 8.5pt; }
</style>
