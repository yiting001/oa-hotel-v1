<script setup lang="ts">
import WorkspaceMetricStrip, {
  type MetricItem as StripMetricItem,
} from '../../../shared/components/WorkspaceMetricStrip.vue';

interface MetricItem {
  key: string;
  label: string;
  count: number;
  hint: string;
}

const props = defineProps<{ items: MetricItem[] }>();
const emit = defineEmits<{ select: [key: string] }>();

/** 指标带与其它页面共用同一实现：桌面横向分栏，手机两列分栏 */
function stripItems(): StripMetricItem[] {
  return props.items.map((item) => ({
    key: item.key,
    label: item.label,
    value: item.count,
    hint: item.hint,
  }));
}
</script>

<template>
  <WorkspaceMetricStrip
    :items="stripItems()"
    interactive
    label="个人工作概览"
    @select="emit('select', $event.key)"
  />
</template>
