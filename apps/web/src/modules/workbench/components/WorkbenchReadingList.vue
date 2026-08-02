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
