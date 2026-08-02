<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: number | null;
    min?: number;
    disabled?: boolean;
    ariaLabel?: string;
  }>(),
  { min: 0, disabled: false, ariaLabel: '金额' },
);

const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>();

const yuanValue = computed({
  get: () => (props.modelValue === null ? null : props.modelValue / 100),
  set: (value: number | null) => {
    emit('update:modelValue', value === null ? null : Math.round(value * 100));
  },
});
</script>

<template>
  <div class="money-input">
    <span aria-hidden="true">¥</span>
    <a-input-number
      v-model:value="yuanValue"
      :aria-label="ariaLabel"
      :disabled="disabled"
      :min="min"
      :precision="2"
      :step="100"
      class="money-input__control"
    />
    <span class="money-input__suffix">元</span>
  </div>
</template>
