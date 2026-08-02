<script setup lang="ts">
import { ArrowRight } from '@element-plus/icons-vue';
import type { PortalContentPage, PortalContentSummary, PortalSection } from '@oa/contracts';
import { ElMessage } from 'element-plus';
import { ref, watch } from 'vue';
import { formatDate } from '../../../shared/format';
import { loadPortalContents } from '../api/portal-api';

const props = defineProps<{ open: boolean; section: PortalSection | null }>();
const emit = defineEmits<{
  'update:open': [value: boolean];
  openContent: [content: PortalContentSummary];
}>();
const pageNumber = ref(1);
const pageSize = 20;
const contentPage = ref<PortalContentPage | null>(null);
const loading = ref(false);
let requestSequence = 0;

watch(
  () => [props.open, props.section?.key] as const,
  ([open]) => {
    requestSequence += 1;
    pageNumber.value = 1;
    contentPage.value = null;
    loading.value = false;
    if (open && props.section) void loadPage(1);
  },
  { immediate: true },
);

async function loadPage(page: number): Promise<void> {
  const section = props.section;
  if (!props.open || !section) return;
  const sequence = ++requestSequence;
  loading.value = true;
  try {
    const result = await loadPortalContents(section.key, page, pageSize);
    if (sequence !== requestSequence || !props.open || props.section?.key !== section.key) return;
    contentPage.value = result;
    pageNumber.value = result.page;
  } catch (error) {
    if (sequence === requestSequence) {
      ElMessage.warning(error instanceof Error ? error.message : '栏目内容加载失败');
    }
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
}

function changePage(page: number): void {
  void loadPage(page);
}
</script>

<template>
  <el-drawer
    :model-value="open"
    size="min(720px, 100%)"
    :title="section?.title || '栏目内容'"
    @update:model-value="emit('update:open', $event)"
  >
    <el-skeleton v-if="loading && !contentPage" :rows="10" animated />
    <div v-else v-loading="loading" class="portal-category-list">
      <button
        v-for="item in contentPage?.items ?? []"
        :key="item.id"
        type="button"
        @click="emit('openContent', item)"
      >
        <span class="portal-content-list__status" :class="{ 'is-read': item.read }" />
        <span>
          <strong>{{ item.title }}</strong>
          <small>
            {{ item.publisherDepartmentName || item.publisherName }} ·
            {{ formatDate(item.publishedAt) }}
          </small>
          <p>{{ item.summary }}</p>
        </span>
        <el-icon><ArrowRight /></el-icon>
      </button>
      <el-empty
        v-if="!loading && (contentPage?.items.length ?? 0) === 0"
        description="暂无内容"
        :image-size="64"
      />
    </div>
    <template v-if="contentPage && contentPage.total > contentPage.pageSize" #footer>
      <div class="portal-category-pagination">
        <span>共 {{ contentPage.total }} 条</span>
        <el-pagination
          background
          :current-page="pageNumber"
          layout="prev, pager, next"
          :page-size="contentPage.pageSize"
          :total="contentPage.total"
          @current-change="changePage"
        />
      </div>
    </template>
  </el-drawer>
</template>
