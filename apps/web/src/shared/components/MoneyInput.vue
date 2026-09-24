<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: number | null;
  min?: number;
  disabled?: boolean;
  ariaLabel?: string;
}>(), { min: 0, disabled: false, ariaLabel: '金额' });
const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>();

const yuanValue = computed({
  get: () => props.modelValue == null ? null : props.modelValue / 100,
  set: (value: number | null | undefined) => {
    emit('update:modelValue', value == null || !Number.isFinite(value) ? null : Math.round(value * 100));
  },
});
</script>

<template>
  <div class="money-input">
    <span class="money-input__prefix" aria-hidden="true">¥</span>
    <el-input-number
      v-model="yuanValue"
      :aria-label="ariaLabel"
      :disabled="disabled"
      :min="min"
      :precision="2"
      :step="1"
      :controls="false"
      class="money-input__control"
    />
    <span class="money-input__suffix">元</span>
  </div>
</template>

<style scoped>
.money-input { display: flex; align-items: center; gap: 6px; min-width: 0; width: 100%; border: 1px solid var(--color-border); border-radius: 5px; background: var(--color-canvas); }
.money-input:focus-within { border-color: var(--color-primary); }
.money-input__prefix, .money-input__suffix { flex: none; color: var(--color-text-secondary); font-size: 13px; }
.money-input__prefix { padding-left: 10px; }
.money-input__suffix { padding-right: 10px; }
.money-input__control { flex: 1; min-width: 0; width: 100%; }
.money-input__control :deep(.el-input__wrapper) { padding: 0; border: 0; box-shadow: none; background: transparent; }
.money-input__control :deep(.el-input__inner) { text-align: left; }
</style>
