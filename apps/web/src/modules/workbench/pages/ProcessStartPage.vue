<script setup lang="ts">
import { Box, Document, EditPen, Search, Stamp, Tickets } from '@element-plus/icons-vue';
import type { DocumentType, PublishedProcessSummary } from '@oa/contracts';
import { computed, onMounted, ref, type Component } from 'vue';
import { useRouter } from 'vue-router';
import { availableProcessStarts, type ProcessStartItem } from '../../../shared/process-start';
import { useSessionStore } from '../../../shared/session';
import { loadPublishedProcessSummaries } from '../api/workbench-api';

interface ProcessStartViewItem extends ProcessStartItem {
  approvalPath: string[];
}

interface ProcessStartGroup {
  key: string;
  label: string;
  icon: Component;
  items: ProcessStartViewItem[];
}

const router = useRouter();
const session = useSessionStore();
const keyword = ref('');
const publishedProcesses = ref<PublishedProcessSummary[]>([]);
const approvalPathLoading = ref(true);
const approvalPathError = ref('');
const starts = computed<ProcessStartViewItem[]>(() => {
  const approvalPaths = new Map(
    publishedProcesses.value.map((process) => [process.documentType, process.approvalPath]),
  );
  return availableProcessStarts(session.user?.permissionCodes ?? []).map((item) => ({
    ...item,
    approvalPath: approvalPaths.get(item.documentType) ?? [],
  }));
});
const normalizedKeyword = computed(() => keyword.value.trim().toLocaleLowerCase());
const documentIcons: Record<DocumentType, Component> = {
  CONTRACT_REQUEST: EditPen,
  CONTRACT_APPROVAL: Document,
  CONTRACT_PAYMENT: Tickets,
  SEAL_BORROW: Box,
  SEAL_USE: Stamp,
  MATERIAL_PURCHASE: Tickets,
  MATERIAL_REQUISITION: Box,
  PURCHASE_APPROVAL: Tickets,
  PETTY_PROCUREMENT: Box,
};
const groupIcons: Record<string, Component> = {
  合同支出: Tickets,
  印章证照: Stamp,
  物资管理: Box,
  采购审批: Tickets,
  零星采买: Box,
};

onMounted(() => void loadApprovalPaths());

const groups = computed<ProcessStartGroup[]>(() => {
  const visible = starts.value.filter((item) => {
    const searchText = [item.label, item.moduleLabel, item.description, ...item.approvalPath]
      .join(' ')
      .toLocaleLowerCase();
    return !normalizedKeyword.value || searchText.includes(normalizedKeyword.value);
  });
  return ['合同支出', '印章证照', '物资管理']
    .map((moduleLabel) => ({
      key: moduleLabel,
      label: moduleLabel,
      icon: groupIcons[moduleLabel],
      items: visible.filter((item) => item.moduleLabel === moduleLabel),
    }))
    .filter((group) => group.items.length > 0);
});

function start(item: ProcessStartItem): void {
  void router.push(item.path);
}

async function loadApprovalPaths(): Promise<void> {
  approvalPathLoading.value = true;
  approvalPathError.value = '';
  try {
    publishedProcesses.value = await loadPublishedProcessSummaries();
  } catch (cause) {
    approvalPathError.value = cause instanceof Error ? cause.message : '审批路径读取失败';
  } finally {
    approvalPathLoading.value = false;
  }
}
</script>

<template>
  <main class="process-start-page ui-page">
    <header class="process-start-header">
      <div>
        <span>流程中心</span>
        <h1>发起申请</h1>
        <p>选择业务表单后进入制单页面。</p>
      </div>
      <el-input
        v-model="keyword"
        aria-label="搜索可发起流程"
        clearable
        :prefix-icon="Search"
        placeholder="搜索表单或审批节点"
      />
    </header>

    <el-alert
      v-if="approvalPathError"
      class="process-start-alert"
      :closable="false"
      show-icon
      title="审批路径暂时无法读取，制单入口仍可正常使用"
      type="warning"
    />

    <section v-for="group in groups" :key="group.key" class="process-start-section">
      <header>
        <span
          ><el-icon><component :is="group.icon" /></el-icon
        ></span>
        <div>
          <h2>{{ group.label }}</h2>
          <small>{{ group.items.length }} 个可发起流程</small>
        </div>
      </header>
      <div class="process-start-list">
        <article
          v-for="item in group.items"
          :key="item.documentType"
          data-testid="process-start-item"
        >
          <span class="process-start-list__icon">
            <el-icon><component :is="documentIcons[item.documentType]" /></el-icon>
          </span>
          <div class="process-start-list__content">
            <h3>{{ item.label }}</h3>
            <p>{{ item.description }}</p>
            <div class="process-start-list__path" aria-label="预计审批路径">
              <span v-if="approvalPathLoading && item.approvalPath.length === 0"
                >正在读取已发布流程</span
              >
              <span v-else-if="item.approvalPath.length === 0">未找到已发布流程</span>
              <template v-else>
                <span v-for="(node, index) in item.approvalPath" :key="node">
                  {{ node }}<i v-if="index < item.approvalPath.length - 1">/</i>
                </span>
              </template>
            </div>
          </div>
          <el-button type="primary" @click="start(item)">开始填写</el-button>
        </article>
      </div>
    </section>

    <el-empty v-if="groups.length === 0" description="没有匹配的可发起流程" />
  </main>
</template>

<style scoped>
.process-start-page { min-width: 0; }
.process-start-header {
  display: flex;
  min-width: 0;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--color-border);
}
.process-start-header > div { min-width: 0; flex: 1 1 320px; }
.process-start-header > div > span { display: block; margin-bottom: 8px; color: var(--color-text-tertiary); font-size: 12px; font-weight: 600; }
.process-start-header h1 { margin: 0; font-size: 32px; font-weight: 600; line-height: 1.25; }
.process-start-header p { margin: 8px 0 0; max-width: 76ch; color: var(--color-text-tertiary); font-size: 14px; line-height: 1.6; }
.process-start-header > :deep(.el-input) { width: var(--control-w-search); flex: 0 0 auto; }

.process-start-section { min-width: 0; }
.process-start-section > header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.process-start-section > header > span {
  display: inline-flex;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
  background: var(--color-surface);
  border-radius: var(--radius-md);
}
.process-start-section > header > div { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.process-start-section h2 { margin: 0; font-size: 18px; }
.process-start-section small { color: var(--color-text-tertiary); font-size: 12px; }

.process-start-list { background: var(--color-canvas); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
.process-start-list article {
  display: grid;
  min-height: 104px;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-soft);
}
.process-start-list article:last-child { border-bottom: 0; }
.process-start-list__icon {
  display: inline-flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  color: var(--color-warning);
  background: var(--color-warning-bg);
  border-radius: var(--radius-md);
}
.process-start-list__icon :deep(.el-icon) { font-size: 20px; }
.process-start-list__content { display: grid; min-width: 0; gap: 6px; }
.process-start-list h3 { margin: 0; font-size: 16px; font-weight: 600; }
.process-start-list p { margin: 0; color: var(--color-text-tertiary); font-size: 13px; line-height: 1.55; }
.process-start-list__path { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; color: var(--color-text-secondary); font-size: 12px; }
.process-start-list__path i { color: var(--color-border-strong); font-style: normal; }

html[data-layout='compact'] .process-start-header { align-items: stretch; flex-direction: column; gap: 16px; padding-bottom: 16px; }
html[data-layout='compact'] .process-start-header h1 { font-size: 24px; }
html[data-layout='compact'] .process-start-header > :deep(.el-input) { width: 100%; }
html[data-layout='compact'] .process-start-list article { min-height: 0; grid-template-columns: 38px minmax(0, 1fr); gap: 12px; padding: 14px; }
html[data-layout='compact'] .process-start-list__icon { width: 38px; height: 38px; align-self: start; }
html[data-layout='compact'] .process-start-list article > .el-button { width: 100%; grid-column: 1 / -1; }
</style>
