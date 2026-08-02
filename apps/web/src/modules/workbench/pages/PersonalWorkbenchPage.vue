<script setup lang="ts">
import { Filter, RefreshLeft } from '@element-plus/icons-vue';
import { WORKBENCH_BOXES, type WorkbenchBox, type WorkbenchItem } from '@oa/contracts';
import { ElMessage } from 'element-plus';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDirectoryStore } from '../../../shared/directory';
import { documentDetailPath } from '../../../shared/document';
import { availableProcessStarts } from '../../../shared/process-start';
import { useSessionStore } from '../../../shared/session';
import PortalContentDrawer from '../../portal/components/PortalContentDrawer.vue';
import { usePortalStore } from '../../portal/store/portal';
import { usePortalContentReader } from '../../portal/usePortalContentReader';
import PersonalWorkbenchHeader from '../components/PersonalWorkbenchHeader.vue';
import WorkbenchBatchApprovalDialog from '../components/WorkbenchBatchApprovalDialog.vue';
import WorkbenchDocumentTable from '../components/WorkbenchDocumentTable.vue';
import WorkbenchFilterControls from '../components/WorkbenchFilterControls.vue';
import WorkbenchReadingList from '../components/WorkbenchReadingList.vue';
import WorkbenchTaskDrawer from '../components/WorkbenchTaskDrawer.vue';
import WorkbenchTaskTable from '../components/WorkbenchTaskTable.vue';
import {
  copyWorkbenchFilters,
  createEmptyWorkbenchFilters,
  createWorkbenchItemsRequest,
  type WorkbenchFilters,
} from '../domain/workbench';
import {
  boxByWorkbenchTab,
  readingStatusByWorkbenchTab,
  resolveWorkbenchTab,
  type WorkbenchTab,
} from '../domain/workbench-tabs';
import { usePersonalWorkbenchStore } from '../store/workbench';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const directory = useDirectoryStore();
const workbench = usePersonalWorkbenchStore();
const portal = usePortalStore();
const {
  drawerOpen: contentDrawerOpen,
  loading: contentLoading,
  content: selectedContent,
  openContent: openReading,
  setDrawerOpen: setContentDrawerOpen,
} = usePortalContentReader('待阅内容加载失败');
const activeTab = ref<WorkbenchTab>(
  resolveWorkbenchTab(route.query.tab, session.can('CONTENT_VIEW'), session.can('DOCUMENT_FOLLOW')),
);
const filters = reactive<WorkbenchFilters>(createEmptyWorkbenchFilters());
const mobileFilters = reactive<WorkbenchFilters>(createEmptyWorkbenchFilters());
const pagination = reactive<Record<WorkbenchBox, { page: number; pageSize: number }>>({
  PENDING: { page: 1, pageSize: 20 },
  COMPLETED: { page: 1, pageSize: 20 },
  MINE: { page: 1, pageSize: 20 },
  DRAFTS: { page: 1, pageSize: 20 },
  FOLLOWING: { page: 1, pageSize: 20 },
  COPIED: { page: 1, pageSize: 20 },
});
const readingPagination = reactive<Record<'UNREAD' | 'READ', { page: number; pageSize: number }>>({
  UNREAD: { page: 1, pageSize: 20 },
  READ: { page: 1, pageSize: 20 },
});
const taskDrawerOpen = ref(false);
const selectedTask = ref<WorkbenchItem | null>(null);
const selectedPendingTasks = ref<WorkbenchItem[]>([]);
const batchDialogOpen = ref(false);
const mobileFilterDrawerOpen = ref(false);
const workbenchSurface = ref<HTMLElement | null>(null);
let filterTimer: number | undefined;

const quickStarts = computed(() => availableProcessStarts(session.user?.permissionCodes ?? []));
const currentBox = computed(() => boxByWorkbenchTab[activeTab.value] ?? null);
const currentReadingStatus = computed(() => readingStatusByWorkbenchTab[activeTab.value] ?? null);
const currentListPagination = computed(() => {
  if (currentBox.value) {
    const state = pagination[currentBox.value];
    return { ...state, total: workbench.pages[currentBox.value].total };
  }
  if (currentReadingStatus.value && currentReadingStatus.value !== 'ALL') {
    const state = readingPagination[currentReadingStatus.value];
    return { ...state, total: portal.readingTotal(currentReadingStatus.value) };
  }
  return null;
});
const currentLoading = computed(() =>
  currentBox.value ? workbench.pageLoading[currentBox.value] : false,
);
const canReadContent = computed(() => session.can('CONTENT_VIEW'));
const canLoadDirectory = computed(() => session.can('DOCUMENT_VIEW'));
const canFollowDocuments = computed(() => session.can('DOCUMENT_FOLLOW'));
const canBatchApprove = computed(
  () => session.can('WORKFLOW_APPROVE') && session.can('WORKFLOW_BATCH_APPROVE'),
);
const isApprovalCenter = computed(() => route.query.tab === 'pending');
const headerContent = computed(() =>
  isApprovalCenter.value
    ? {
        eyebrow: '审批中心',
        title: '待我审批',
        description: '集中办理当前待办，查看审批依据、流程记录并完成批量处理。',
      }
    : {
        eyebrow: '个人工作台',
        title: `${session.user?.displayName ?? '用户'}的工作空间`,
        description: '集中处理任务、跟踪本人单据并完成信息阅办。',
      },
);
const showApplicantFilter = computed(() =>
  ['pending', 'completed', 'following', 'copied'].includes(activeTab.value),
);
const showStatusFilter = computed(() => ['mine', 'following', 'copied'].includes(activeTab.value));
const selectedPendingIds = computed(() => selectedPendingTasks.value.map((task) => task.id));
const metricItems = computed(() =>
  [
    { key: 'pending', label: '待我审批', count: workbench.count('PENDING'), hint: '需要办理' },
    { key: 'completed', label: '已办', count: workbench.count('COMPLETED'), hint: '办理记录' },
    { key: 'mine', label: '我发起的', count: workbench.count('MINE'), hint: '跟踪进度' },
    { key: 'drafts', label: '草稿', count: workbench.count('DRAFTS'), hint: '继续编辑' },
    { key: 'following', label: '我的关注', count: workbench.count('FOLLOWING'), hint: '持续跟踪' },
    { key: 'copied', label: '抄送我的', count: workbench.count('COPIED'), hint: '协同查阅' },
  ].filter((item) => item.key !== 'following' || canFollowDocuments.value),
);
const activeFilterCount = computed(() => {
  let count = 0;
  if (filters.keyword.trim()) count += 1;
  if (filters.documentType !== 'ALL') count += 1;
  if (showApplicantFilter.value && filters.applicantId) count += 1;
  if (filters.departmentId) count += 1;
  if (showStatusFilter.value && filters.status !== 'ALL') count += 1;
  if (filters.dateRange.length === 2) count += 1;
  return count;
});
const workbenchTabOptions = computed<Array<{ label: string; value: WorkbenchTab }>>(() => {
  const options: Array<{ label: string; value: WorkbenchTab }> = [
    { value: 'pending', label: `待办审批 (${workbench.count('PENDING')})` },
    { value: 'completed', label: `已办记录 (${workbench.count('COMPLETED')})` },
    { value: 'mine', label: `我发起的 (${workbench.count('MINE')})` },
    { value: 'drafts', label: `草稿 (${workbench.count('DRAFTS')})` },
  ];
  if (canFollowDocuments.value) {
    options.push({ value: 'following', label: `我的关注 (${workbench.count('FOLLOWING')})` });
  }
  options.push({ value: 'copied', label: `抄送我的 (${workbench.count('COPIED')})` });
  if (canReadContent.value) {
    options.push(
      { value: 'unread', label: `待阅 (${portal.readingTotal('UNREAD')})` },
      { value: 'read', label: `已阅 (${portal.readingTotal('READ')})` },
    );
  }
  return options;
});

onMounted(() => {
  void refresh();
  void scrollActiveTabIntoView();
});
onBeforeUnmount(() => window.clearTimeout(filterTimer));

watch(activeTab, (tab) => {
  if (tab !== 'pending') selectedPendingTasks.value = [];
  void router.replace({ query: { ...route.query, tab } });
  const box = boxByWorkbenchTab[tab];
  if (box) void loadBox(box);
  const status = readingStatusByWorkbenchTab[tab];
  if (status && status !== 'ALL' && canReadContent.value) void loadReading(status);
  void scrollActiveTabIntoView();
});
watch(
  () => route.query.tab,
  (value) => {
    const tab = resolveWorkbenchTab(value, canReadContent.value, canFollowDocuments.value);
    if (tab !== activeTab.value) activeTab.value = tab;
  },
);
watch(
  filters,
  () => {
    selectedPendingTasks.value = [];
    for (const box of WORKBENCH_BOXES) pagination[box].page = 1;
    scheduleCurrentBoxLoad();
  },
  { deep: true },
);

async function refresh(): Promise<void> {
  await Promise.all([refreshBusinessBoxes(), refreshDirectory(), refreshReadings()]);
}

async function refreshBusinessBoxes(): Promise<void> {
  try {
    await workbench.refreshSummary();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '工作台摘要加载失败');
  }
  if (currentBox.value) await loadBox(currentBox.value);
}

async function refreshDirectory(): Promise<void> {
  if (!canLoadDirectory.value) return;
  try {
    await directory.load();
  } catch (error) {
    ElMessage.warning(error instanceof Error ? error.message : '筛选目录加载失败');
  }
}

async function refreshReadings(): Promise<void> {
  if (!canReadContent.value) return;
  await Promise.all([loadReading('UNREAD'), loadReading('READ')]);
}

async function refreshAfterTask(): Promise<void> {
  selectedPendingTasks.value = [];
  try {
    await workbench.refreshSummary();
    if (currentBox.value) await loadBox(currentBox.value);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '工作台刷新失败');
  }
}

async function refreshCollaboration(): Promise<void> {
  try {
    await workbench.refreshSummary();
    if (currentBox.value === 'FOLLOWING' || currentBox.value === 'COPIED') {
      await loadBox(currentBox.value);
    }
  } catch (error) {
    ElMessage.warning(error instanceof Error ? error.message : '协作状态刷新失败');
  }
}

async function loadBox(box: WorkbenchBox): Promise<void> {
  try {
    const page = pagination[box];
    await workbench.loadPage(createWorkbenchItemsRequest(box, page.page, page.pageSize, filters));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '工作台列表加载失败');
  }
}

async function loadReading(status: 'UNREAD' | 'READ'): Promise<void> {
  try {
    const page = readingPagination[status];
    await portal.refreshReading(status, page.page, page.pageSize);
  } catch (error) {
    ElMessage.warning(error instanceof Error ? error.message : '阅办列表加载失败');
  }
}

function scheduleCurrentBoxLoad(): void {
  window.clearTimeout(filterTimer);
  const box = currentBox.value;
  if (!box) return;
  filterTimer = window.setTimeout(() => void loadBox(box), 250);
}

function changePage(page: number): void {
  const box = currentBox.value;
  if (box) {
    if (box === 'PENDING') selectedPendingTasks.value = [];
    pagination[box].page = page;
    void loadBox(box);
    return;
  }
  const status = currentReadingStatus.value;
  if (status && status !== 'ALL') {
    readingPagination[status].page = page;
    void loadReading(status);
  }
}

function changePageSize(pageSize: number): void {
  const box = currentBox.value;
  if (box) {
    if (box === 'PENDING') selectedPendingTasks.value = [];
    pagination[box] = { page: 1, pageSize };
    void loadBox(box);
    return;
  }
  const status = currentReadingStatus.value;
  if (status && status !== 'ALL') {
    readingPagination[status] = { page: 1, pageSize };
    void loadReading(status);
  }
}

function resetFilters(): void {
  Object.assign(filters, createEmptyWorkbenchFilters());
}

function updateDesktopFilters(value: WorkbenchFilters): void {
  Object.assign(filters, copyWorkbenchFilters(value));
}

function updateMobileFilterDraft(value: WorkbenchFilters): void {
  Object.assign(mobileFilters, copyWorkbenchFilters(value));
}

function openMobileFilters(): void {
  Object.assign(mobileFilters, copyWorkbenchFilters(filters));
  mobileFilterDrawerOpen.value = true;
}

function applyMobileFilters(): void {
  Object.assign(filters, copyWorkbenchFilters(mobileFilters));
  mobileFilterDrawerOpen.value = false;
}

function resetMobileFilters(): void {
  const empty = createEmptyWorkbenchFilters();
  Object.assign(mobileFilters, copyWorkbenchFilters(empty));
  Object.assign(filters, empty);
  mobileFilterDrawerOpen.value = false;
}

function openTask(task: WorkbenchItem): void {
  selectedTask.value = task;
  taskDrawerOpen.value = true;
}

async function openDocument(document: WorkbenchItem): Promise<void> {
  if (document.box === 'COPIED' && document.copyId && !document.copyReadAt) {
    try {
      await workbench.markCopyRead(document.copyId);
    } catch (error) {
      ElMessage.warning(error instanceof Error ? error.message : '抄送已读状态更新失败');
    }
  }
  await router.push(documentDetailPath(document.documentType, document.documentId));
}

function selectMetric(key: string): void {
  activeTab.value = key as WorkbenchTab;
}

function updatePendingSelection(tasks: WorkbenchItem[]): void {
  selectedPendingTasks.value = tasks;
}

function openBatchApproval(): void {
  if (selectedPendingTasks.value.length > 0) batchDialogOpen.value = true;
}

async function scrollActiveTabIntoView(): Promise<void> {
  await nextTick();
  workbenchSurface.value
    ?.querySelector<HTMLElement>(`#tab-${activeTab.value}`)
    ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
</script>

<template>
  <main class="personal-workbench-page">
    <PersonalWorkbenchHeader
      :description="headerContent.description"
      :eyebrow="headerContent.eyebrow"
      :items="metricItems"
      :loading="
        workbench.summaryLoading ||
        currentLoading ||
        directory.loading ||
        (canReadContent && portal.readingLoading)
      "
      :quick-starts="quickStarts"
      :title="headerContent.title"
      @refresh="refresh"
      @select="selectMetric"
      @start="router.push($event)"
    />

    <section ref="workbenchSurface" class="workbench-surface">
      <div class="workbench-mobile-tab-select">
        <span>工作箱</span>
        <el-select v-model="activeTab" aria-label="选择工作箱">
          <el-option
            v-for="option in workbenchTabOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
      </div>
      <div v-if="currentBox" class="workbench-filter-bar">
        <WorkbenchFilterControls
          :departments="directory.departments"
          :model-value="filters"
          :show-applicant="showApplicantFilter"
          :show-status="showStatusFilter"
          :users="directory.users"
          @update:model-value="updateDesktopFilters"
        />
        <el-button :icon="RefreshLeft" @click="resetFilters">重置</el-button>
      </div>
      <div v-if="currentBox" class="workbench-mobile-filter">
        <el-button :icon="Filter" @click="openMobileFilters">
          筛选
          <el-badge v-if="activeFilterCount" :value="activeFilterCount" />
        </el-button>
      </div>

      <el-tabs v-model="activeTab" class="workbench-tabs">
        <el-tab-pane name="pending"
          ><template #label>待办<el-badge :value="workbench.count('PENDING')" /></template>
          <div v-if="canBatchApprove" class="workbench-batch-toolbar">
            <span>已选择 {{ selectedPendingTasks.length }} 条本页待办</span>
            <div>
              <el-button v-if="selectedPendingTasks.length" link @click="selectedPendingTasks = []"
                >清空</el-button
              >
              <el-button
                aria-label="批量同意所选待办"
                data-testid="batch-approval-open"
                :disabled="selectedPendingTasks.length === 0"
                type="primary"
                @click="openBatchApproval"
                >批量同意</el-button
              >
            </div>
          </div>
          <WorkbenchTaskTable
            :loading="workbench.pageLoading.PENDING"
            :selectable="canBatchApprove"
            :selected-ids="selectedPendingIds"
            :tasks="workbench.pages.PENDING.items"
            @open="openTask"
            @selection-change="updatePendingSelection"
        /></el-tab-pane>
        <el-tab-pane name="completed" label="已办"
          ><WorkbenchTaskTable
            action-label="查看"
            :loading="workbench.pageLoading.COMPLETED"
            :tasks="workbench.pages.COMPLETED.items"
            @open="openTask"
        /></el-tab-pane>
        <el-tab-pane name="mine" label="我发起的"
          ><WorkbenchDocumentTable
            :documents="workbench.pages.MINE.items"
            :loading="workbench.pageLoading.MINE"
            @open="openDocument"
        /></el-tab-pane>
        <el-tab-pane name="drafts"
          ><template #label>草稿<el-badge :value="workbench.count('DRAFTS')" /></template
          ><WorkbenchDocumentTable
            :documents="workbench.pages.DRAFTS.items"
            :loading="workbench.pageLoading.DRAFTS"
            @open="openDocument"
        /></el-tab-pane>
        <el-tab-pane v-if="canFollowDocuments" name="following"
          ><template #label>关注<el-badge :value="workbench.count('FOLLOWING')" /></template
          ><WorkbenchDocumentTable
            :documents="workbench.pages.FOLLOWING.items"
            :loading="workbench.pageLoading.FOLLOWING"
            @open="openDocument"
        /></el-tab-pane>
        <el-tab-pane name="copied"
          ><template #label>抄送我<el-badge :value="workbench.count('COPIED')" /></template
          ><WorkbenchDocumentTable
            :documents="workbench.pages.COPIED.items"
            :loading="workbench.pageLoading.COPIED"
            @open="openDocument"
        /></el-tab-pane>
        <el-tab-pane v-if="canReadContent" name="unread"
          ><template #label>待阅<el-badge :value="portal.readingTotal('UNREAD')" /></template
          ><WorkbenchReadingList
            :items="portal.readings.UNREAD"
            :loading="portal.readingLoadingByStatus.UNREAD"
            @open="openReading"
        /></el-tab-pane>
        <el-tab-pane v-if="canReadContent" name="read" label="已阅"
          ><WorkbenchReadingList
            :items="portal.readings.READ"
            :loading="portal.readingLoadingByStatus.READ"
            @open="openReading"
        /></el-tab-pane>
      </el-tabs>

      <footer v-if="currentListPagination" class="workbench-pagination">
        <span>共 {{ currentListPagination.total }} 条</span>
        <el-pagination
          background
          :current-page="currentListPagination.page"
          layout="sizes, prev, pager, next"
          :page-size="currentListPagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="currentListPagination.total"
          @current-change="changePage"
          @size-change="changePageSize"
        />
      </footer>
    </section>

    <WorkbenchTaskDrawer
      v-model:open="taskDrawerOpen"
      :task="selectedTask"
      @collaboration-changed="refreshCollaboration"
      @completed="refreshAfterTask"
    />
    <WorkbenchBatchApprovalDialog
      v-model:open="batchDialogOpen"
      :tasks="selectedPendingTasks"
      @completed="refreshAfterTask"
    />
    <PortalContentDrawer
      :open="contentDrawerOpen"
      :content="selectedContent"
      :loading="contentLoading"
      @update:open="setContentDrawerOpen"
    />
    <el-drawer
      v-model="mobileFilterDrawerOpen"
      direction="btt"
      size="min(620px, 78vh)"
      title="筛选工作台"
    >
      <WorkbenchFilterControls
        :departments="directory.departments"
        :model-value="mobileFilters"
        :show-applicant="showApplicantFilter"
        :show-status="showStatusFilter"
        stacked
        :users="directory.users"
        @update:model-value="updateMobileFilterDraft"
      />
      <template #footer>
        <div class="workbench-mobile-filter__actions">
          <el-button :icon="RefreshLeft" @click="resetMobileFilters">重置</el-button>
          <el-button type="primary" @click="applyMobileFilters">应用</el-button>
        </div>
      </template>
    </el-drawer>
  </main>
</template>
