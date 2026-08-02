<script setup lang="ts">
interface MetricItem {
  key: string;
  label: string;
  count: number;
  hint: string;
}

defineProps<{ items: MetricItem[] }>();
const emit = defineEmits<{ select: [key: string] }>();
</script>

<template>
  <section class="workbench-metrics" aria-label="个人工作概览">
    <button v-for="item in items" :key="item.key" type="button" @click="emit('select', item.key)">
      <span>{{ item.label }}</span
      ><strong>{{ item.count }}</strong
      ><small>{{ item.hint }}</small>
    </button>
  </section>
</template>
