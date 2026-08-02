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
};
const groupIcons: Record<string, Component> = {
  合同支出: Tickets,
  行政印章: Stamp,
  物资管理: Box,
};

onMounted(() => void loadApprovalPaths());

const groups = computed<ProcessStartGroup[]>(() => {
  const visible = starts.value.filter((item) => {
    const searchText = [item.label, item.moduleLabel, item.description, ...item.approvalPath]
      .join(' ')
      .toLocaleLowerCase();
    return !normalizedKeyword.value || searchText.includes(normalizedKeyword.value);
  });
  return ['合同支出', '行政印章', '物资管理']
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
  <main class="process-start-page">
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
