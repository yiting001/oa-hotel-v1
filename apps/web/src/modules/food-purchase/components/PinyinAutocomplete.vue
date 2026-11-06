<script setup lang="ts">
import { computed } from 'vue';
import type { FoodCatalogOption } from '../food-catalog';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    options: readonly FoodCatalogOption[];
    placeholder?: string;
    disabled?: boolean;
    maxlength?: number;
  }>(),
  { placeholder: '', disabled: false, maxlength: 100 },
);
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const value = computed({
  get: () => props.modelValue,
  set: (next: string) => emit('update:modelValue', next ?? ''),
});

/** 支持按中文、拼音首字母（如 wr → 五花肉）检索，也可直接手填。 */
function fetchSuggestions(
  query: string,
  callback: (items: Array<{ value: string }>) => void,
): void {
  const keyword = query.trim().toLocaleLowerCase();
  const matched = keyword
    ? props.options.filter(
        (option) => option.name.includes(keyword) || option.initials.includes(keyword),
      )
    : props.options;
  callback(matched.slice(0, 15).map((option) => ({ value: option.name })));
}

// 用拼音匹配时输入框里仍是字母，选中后替换成中文名称
function onSelect(item: { value: string }): void {
  value.value = item.value;
}
</script>

<template>
  <el-autocomplete
    v-model="value"
    :disabled="disabled"
    :fetch-suggestions="fetchSuggestions"
    :maxlength="maxlength"
    :placeholder="placeholder"
    class="pinyin-autocomplete"
    clearable
    value-key="value"
    @select="onSelect"
  />
</template>

<style scoped>
.pinyin-autocomplete { width: 100%; }
</style>
