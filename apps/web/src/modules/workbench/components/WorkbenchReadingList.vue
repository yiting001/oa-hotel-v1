<script setup lang="ts">
import { ArrowRight } from '@element-plus/icons-vue';
import type { PortalContentSummary } from '@oa/contracts';
import { formatDateTime } from '../../../shared/format';
import { portalCategoryLabels } from '../../portal/domain/portal';

withDefaults(defineProps<{ items: PortalContentSummary[]; loading?: boolean }>(), {
  loading: false,
});
const emit = defineEmits<{ open: [content: PortalContentSummary] }>();
</script>

<template>
  <div v-loading="loading" class="workbench-reading-list">
    <button v-for="item in items" :key="item.id" type="button" @click="emit('open', item)">
      <span class="workbench-reading-list__marker" :class="{ 'is-read': item.read }" />
      <span class="workbench-reading-list__copy">
        <span
          ><el-tag size="small" effect="plain">{{ portalCategoryLabels[item.category] }}</el-tag
          ><strong>{{ item.title }}</strong></span
        >
        <small
          >{{ item.publisherName }} · {{ item.publisherDepartmentName }} ·
          {{ formatDateTime(item.publishedAt) }}</small
        >
        <p>{{ item.summary }}</p>
      </span>
      <el-icon><ArrowRight /></el-icon>
    </button>
    <el-empty v-if="!loading && items.length === 0" description="暂无内容" :image-size="64" />
  </div>
</template>

<style scoped>
.workbench-reading-list { display: grid; min-width: 0; }
.workbench-reading-list > button {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 88px;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 4px;
  color: inherit;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  text-align: left;
}
.workbench-reading-list > button:hover { background: var(--color-surface); }
.workbench-reading-list__marker {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  margin-top: 8px;
  background: var(--color-danger);
  border-radius: 50%;
}
.workbench-reading-list__marker.is-read { background: var(--color-text-tertiary); }
.workbench-reading-list__copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 5px; }
.workbench-reading-list__copy > span { display: flex; min-width: 0; align-items: center; gap: 8px; }
.workbench-reading-list__copy strong { min-width: 0; overflow: hidden; font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.workbench-reading-list__copy small { color: var(--color-text-tertiary); font-size: 12px; }
.workbench-reading-list__copy p {
  margin: 0;
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.workbench-reading-list > button > :deep(.el-icon) { flex: 0 0 auto; margin-top: 4px; color: var(--color-text-tertiary); }
</style>
