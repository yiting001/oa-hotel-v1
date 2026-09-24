<script setup lang="ts">
import { computed } from 'vue';
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue';
import { useLayoutMode } from './useLayoutMode';

const props = withDefaults(defineProps<{ page?: number; pageSize?: number; total: number; pageSizes?: number[] }>(), {
  page: 1, pageSize: 20, pageSizes: () => [10, 20, 50],
});
const emit = defineEmits<{
  'update:page': [page: number];
  'update:pageSize': [pageSize: number];
  change: [state: { page: number; pageSize: number }];
}>();
const { isCompact } = useLayoutMode();
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)));
function changePage(page: number): void {
  emit('update:page', page);
  emit('change', { page, pageSize: props.pageSize });
}
function changeSize(pageSize: number): void {
  emit('update:pageSize', pageSize);
  emit('update:page', 1);
  emit('change', { page: 1, pageSize });
}
</script>

<template>
  <nav class="ui-pagination" aria-label="列表分页">
    <span class="ui-pagination__total">共 {{ total }} 条</span>
    <div v-if="isCompact" class="ui-pagination__compact">
      <el-button :icon="ArrowLeft" circle aria-label="上一页" :disabled="page <= 1" @click="changePage(page - 1)" />
      <span>{{ page }} / {{ pageCount }}</span>
      <el-button :icon="ArrowRight" circle aria-label="下一页" :disabled="page >= pageCount" @click="changePage(page + 1)" />
    </div>
    <el-pagination v-else :current-page="page" :page-size="pageSize" :page-sizes="pageSizes" :total="total" layout="sizes, prev, pager, next" @update:current-page="changePage" @update:page-size="changeSize" />
  </nav>
</template>
