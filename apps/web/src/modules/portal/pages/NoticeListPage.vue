<script setup lang="ts">
import { ArrowRight, Search } from '@element-plus/icons-vue';
import type { PortalContentDetail, PortalContentSummary } from '@oa/contracts';
import { ElMessage } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import WorkspaceFilterBar from '../../../shared/components/WorkspaceFilterBar.vue';
import { formatDate } from '../../../shared/format';
import UiPagination from '../../../ui/UiPagination.vue';
import { loadPortalContent, loadPortalContents, markPortalContentRead } from '../api/portal-api';
import PortalContentDrawer from '../components/PortalContentDrawer.vue';

const loading = ref(false);
const keyword = ref('');
const items = ref<PortalContentSummary[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const readIds = ref<Set<string>>(new Set());
const drawerOpen = ref(false);
const detailLoading = ref(false);
const selectedContent = ref<PortalContentDetail | null>(null);

const visibleKeyword = computed(() => keyword.value.trim().toLocaleLowerCase());

async function refresh(): Promise<void> {
  loading.value = true;
  try {
    const response = await loadPortalContents('NOTICE', page.value, pageSize.value);
    items.value = response.items;
    total.value = response.total;
    readIds.value = new Set(response.items.filter((item) => item.read).map((item) => item.id));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '公司通知加载失败');
  } finally {
    loading.value = false;
  }
}

async function openContent(item: PortalContentSummary): Promise<void> {
  detailLoading.value = true;
  drawerOpen.value = true;
  try {
    selectedContent.value = await loadPortalContent(item.id);
    if (!item.read) {
      await markPortalContentRead(item.id);
      readIds.value = new Set([...readIds.value, item.id]);
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '通知详情加载失败');
  } finally {
    detailLoading.value = false;
  }
}

function changePage(next: { page: number; pageSize: number }): void {
  page.value = next.page;
  pageSize.value = next.pageSize;
  void refresh();
}

onMounted(() => void refresh());
</script>

<template>
  <main class="ui-page notice-list-page">
    <AppPageHeader
      description="公司通知与公告集中发布，点击标题查看详情并记录已读。"
      eyebrow="业务中心"
      title="公司通知"
    />
    <WorkspaceFilterBar label="通知筛选" :result-label="`共 ${total} 条`">
      <template #search>
        <el-input v-model="keyword" clearable :prefix-icon="Search" placeholder="按标题或摘要过滤当前页" aria-label="搜索通知" />
      </template>
    </WorkspaceFilterBar>
    <div v-loading="loading" class="notice-list">
      <button
        v-for="item in items.filter((candidate) => !visibleKeyword || `${candidate.title} ${candidate.summary}`.toLocaleLowerCase().includes(visibleKeyword))"
        :key="item.id"
        class="notice-list__item"
        type="button"
        @click="openContent(item)"
      >
        <span class="notice-list__marker" :class="{ 'is-read': readIds.has(item.id) }" />
        <span class="notice-list__copy">
          <strong>{{ item.title }}</strong>
          <small>{{ item.publisherName }} · {{ item.publisherDepartmentName }} · {{ formatDate(item.publishedAt) }}</small>
          <p>{{ item.summary }}</p>
        </span>
        <el-icon><ArrowRight /></el-icon>
      </button>
      <el-empty v-if="!loading && items.length === 0" description="暂无公司通知" :image-size="64" />
    </div>
    <UiPagination v-if="total > pageSize" v-model:page="page" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]" :total="total" @change="changePage" />
    <PortalContentDrawer
      :content="selectedContent"
      :loading="detailLoading"
      :open="drawerOpen"
      @update:open="drawerOpen = $event"
    />
  </main>
</template>

<style scoped>
.notice-list { display: grid; min-width: 0; }
.notice-list__item {
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
.notice-list__item:hover { background: var(--color-surface); }
.notice-list__marker { width: 7px; height: 7px; flex: 0 0 7px; margin-top: 8px; background: var(--color-brand-coral); border-radius: 50%; }
.notice-list__marker.is-read { background: var(--color-border-strong); }
.notice-list__copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 5px; }
.notice-list__copy strong { min-width: 0; overflow: hidden; font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.notice-list__copy small { color: var(--color-text-tertiary); font-size: 12px; }
.notice-list__copy p { margin: 0; overflow: hidden; color: var(--color-text-secondary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.notice-list__item > :deep(.el-icon) { flex: 0 0 auto; margin-top: 4px; color: var(--color-text-tertiary); }
</style>
