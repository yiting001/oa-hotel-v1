<script setup lang="ts">
import { useLayoutMode } from './useLayoutMode';
withDefaults(defineProps<{ modelValue: boolean; title: string; width?: string | number; closeOnClickModal?: boolean }>(), {
  width: 640, closeOnClickModal: false,
});
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; closed: []; open: [] }>();
const { isCompact } = useLayoutMode();
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    :width="width"
    :fullscreen="isCompact"
    :close-on-click-modal="closeOnClickModal"
    append-to-body
    class="ui-dialog"
    :class="{ 'ui-dialog--compact': isCompact }"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="emit('closed')"
    @open="emit('open')"
  >
    <slot />
    <template v-if="$slots.footer" #footer><div class="ui-actions ui-actions--end"><slot name="footer" /></div></template>
  </el-dialog>
</template>
