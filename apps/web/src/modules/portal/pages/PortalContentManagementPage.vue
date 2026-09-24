<script setup lang="ts">
import { useLayoutMode } from '../../../ui/useLayoutMode';
import UiDataList, { type DataColumn } from '../../../ui/UiDataList.vue';
import { Clock, Edit, Plus, Promotion, Refresh, Remove, Search } from '@element-plus/icons-vue';
import type {
  PortalAdminContentDetail,
  PortalAdminContentSummary,
  PortalAudienceDirectory,
  PortalAudienceType,
  PortalContentAuditTrail,
  PortalContentCategory,
  PortalContentStatus,
} from '@oa/contracts';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import {
  businessDateTimeInputValue,
  businessLocalDateTimeToIso,
} from '../../../shared/business-time';
import { formatDateTime } from '../../../shared/format';
import {
  createPortalAdminContent,
  loadPortalAdminContent,
  loadPortalAdminContents,
  loadPortalAudienceDirectory,
  loadPortalContentAudit,
  publishPortalAdminContent,
  updatePortalAdminContent,
  withdrawPortalAdminContent,
  type PortalContentWritePayload,
} from '../api/portal-admin-api';
import PortalContentAuditDrawer from '../components/admin/PortalContentAuditDrawer.vue';
import PortalContentEditorDrawer from '../components/admin/PortalContentEditorDrawer.vue';
import { portalCategoryLabels } from '../domain/portal';

const pageSize = 20;

const { isCompact } = useLayoutMode();
const loading = ref(false);
const page = ref(1);
const total = ref(0);
const items = ref<PortalAdminContentSummary[]>([]);
const directory = ref<PortalAudienceDirectory | null>(null);
const filters = reactive<{
  keyword: string;
  status: PortalContentStatus | '';
  category: PortalContentCategory | '';
}>({ keyword: '', status: '', category: '' });
const editorOpen = ref(false);
const editorContent = ref<PortalAdminContentDetail | null>(null);
const editorSaving = ref(false);
const publishOpen = ref(false);
const publishTarget = ref<PortalAdminContentSummary | null>(null);
const publishMode = ref<'NOW' | 'SCHEDULED'>('NOW');
const scheduledAt = ref('');
const publishDatePicker = ref<{ handleClose: () => void } | null>(null);
const publishing = ref(false);
const auditOpen = ref(false);
const auditTitle = ref('');
const auditTrail = ref<PortalContentAuditTrail | null>(null);
const auditLoading = ref(false);

type StatusTagType = 'info' | 'warning' | 'success' | 'danger';
const tableColumns: DataColumn[] = [
  { key: 'title', label: '内容', minWidth: 280 },
  { key: 'status', label: '状态', width: 120 },
  { key: 'audience', label: '发布受众', minWidth: 150 },
  { key: 'currentRevision', label: '修订', width: 84 },
  { key: 'updatedAt', label: '更新时间', minWidth: 170 },
  { key: 'actions', label: '操作', width: 240 },
];

const statusMeta: Record<PortalContentStatus, { label: string; type: StatusTagType }> = {
  DRAFT: { label: '草稿', type: 'info' },
  SCHEDULED: { label: '定时发布', type: 'warning' },
  PUBLISHED: { label: '已发布', type: 'success' },
  WITHDRAWN: { label: '已撤回', type: 'danger' },
};
const categoryOptions = Object.entries(portalCategoryLabels) as Array<
  [PortalContentCategory, string]
>;
const pageSummary = computed(() => {
  const published = items.value.filter((item) => item.status === 'PUBLISHED').length;
  const pending = items.value.filter(
    (item) => item.status === 'DRAFT' || item.status === 'SCHEDULED',
  ).length;
  return { published, pending };
});

onMounted(async () => {
  try {
    directory.value = await loadPortalAudienceDirectory();
  } catch (error) {
    ElMessage.error(messageOf(error, '受众目录加载失败'));
  }
  await refresh();
});

async function refresh(): Promise<void> {
  loading.value = true;
  try {
    const result = await loadPortalAdminContents({
      page: page.value,
      pageSize,
      status: filters.status || undefined,
      category: filters.category || undefined,
      keyword: filters.keyword.trim() || undefined,
    });
    items.value = result.items;
    total.value = result.total;
    page.value = result.page;
  } catch (error) {
    ElMessage.error(messageOf(error, '内容列表加载失败'));
  } finally {
    loading.value = false;
  }
}

function search(): void {
  page.value = 1;
  void refresh();
}

function resetFilters(): void {
  filters.keyword = '';
  filters.status = '';
  filters.category = '';
  search();
}

function openCreate(): void {
  editorContent.value = null;
  editorOpen.value = true;
}

async function openEdit(item: PortalAdminContentSummary): Promise<void> {
  try {
    editorContent.value = await loadPortalAdminContent(item.id);
    editorOpen.value = true;
  } catch (error) {
    ElMessage.error(messageOf(error, '内容详情加载失败'));
  }
}

async function saveContent(payload: PortalContentWritePayload): Promise<void> {
  editorSaving.value = true;
  try {
    if (editorContent.value) {
      await updatePortalAdminContent(editorContent.value.id, payload);
      ElMessage.success('修订已保存');
    } else {
      await createPortalAdminContent(payload);
      ElMessage.success('草稿已创建');
    }
    editorOpen.value = false;
    await refresh();
  } catch (error) {
    ElMessage.error(messageOf(error, '内容保存失败'));
  } finally {
    editorSaving.value = false;
  }
}

function openPublish(item: PortalAdminContentSummary): void {
  publishTarget.value = item;
  publishMode.value = item.status === 'SCHEDULED' ? 'SCHEDULED' : 'NOW';
  scheduledAt.value =
    item.status === 'SCHEDULED' ? businessDateTimeInputValue(item.publishedAt) : '';
  publishOpen.value = true;
}

function updateScheduledAt(value: unknown): void {
  scheduledAt.value = typeof value === 'string' ? value : '';
  void nextTick(() => publishDatePicker.value?.handleClose());
}

async function confirmPublish(): Promise<void> {
  const target = publishTarget.value;
  if (!target) return;
  if (publishMode.value === 'SCHEDULED' && !scheduledAt.value) {
    ElMessage.warning('请选择定时发布时间');
    return;
  }
  publishing.value = true;
  try {
    const publishAt =
      publishMode.value === 'SCHEDULED' ? businessLocalDateTimeToIso(scheduledAt.value) : null;
    await publishPortalAdminContent(target.id, publishAt);
    ElMessage.success(publishMode.value === 'SCHEDULED' ? '定时发布已设置' : '内容已发布');
    publishOpen.value = false;
    await refresh();
  } catch (error) {
    ElMessage.error(messageOf(error, '发布失败'));
  } finally {
    publishing.value = false;
  }
}

async function withdraw(item: PortalAdminContentSummary): Promise<void> {
  try {
    await ElMessageBox.confirm(`撤回“${item.title}”后，门户将立即停止展示该内容。`, '确认撤回', {
      confirmButtonText: '确认撤回',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await withdrawPortalAdminContent(item.id);
    ElMessage.success('内容已撤回');
    await refresh();
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(messageOf(error, '撤回失败'));
  }
}

async function openAudit(item: PortalAdminContentSummary): Promise<void> {
  auditOpen.value = true;
  auditTitle.value = item.title;
  auditTrail.value = null;
  auditLoading.value = true;
  try {
    auditTrail.value = await loadPortalContentAudit(item.id);
  } catch (error) {
    ElMessage.error(messageOf(error, '审计记录加载失败'));
  } finally {
    auditLoading.value = false;
  }
}

function audienceLabel(item: PortalAdminContentSummary): string {
  if (item.audienceType === 'ALL') return '全员';
  const names = item.audienceIds.map((id) => audienceName(item.audienceType, id));
  return names.length > 2
    ? `${names.slice(0, 2).join('、')} 等 ${names.length} 项`
    : names.join('、');
}

function categoryLabel(item: PortalAdminContentSummary): string {
  return portalCategoryLabels[item.category];
}

function statusLabel(item: PortalAdminContentSummary): string {
  return statusMeta[item.status].label;
}

function statusType(item: PortalAdminContentSummary): StatusTagType {
  return statusMeta[item.status].type;
}

function audienceName(type: PortalAudienceType, id: string): string {
  if (!directory.value) return id;
  if (type === 'DEPARTMENT') {
    return directory.value.departments.find((item) => item.id === id)?.name ?? id;
  }
  if (type === 'ROLE') return directory.value.roles.find((item) => item.code === id)?.name ?? id;
  return directory.value.users.find((item) => item.id === id)?.displayName ?? id;
}

function changePage(value: number): void {
  page.value = value;
  void refresh();
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
</script>

<template>
  <main class="portal-content-admin-page ui-page" :data-compact="isCompact">
    <header class="portal-admin-header">
      <div>
        <span>公司门户</span>
        <h1>内容管理</h1>
      </div>
      <el-button :icon="Plus" data-testid="portal-content-create" type="primary" @click="openCreate"
        >新建内容</el-button
      >
    </header>

    <section class="portal-admin-metrics" aria-label="内容统计">
      <div>
        <span>内容总数</span><strong>{{ total }}</strong>
      </div>
      <div>
        <span>当前页已发布</span><strong>{{ pageSummary.published }}</strong>
      </div>
      <div>
        <span>当前页待处理</span><strong>{{ pageSummary.pending }}</strong>
      </div>
    </section>

    <section class="portal-admin-toolbar ui-toolbar" aria-label="内容筛选">
      <el-input
        v-model="filters.keyword"
        aria-label="搜索内容"
        clearable
        placeholder="标题或摘要"
        @keyup.enter="search"
      />
      <el-select v-model="filters.status" aria-label="内容状态" clearable placeholder="全部状态">
        <el-option v-for="(meta, key) in statusMeta" :key="key" :label="meta.label" :value="key" />
      </el-select>
      <el-select
        v-model="filters.category"
        aria-label="内容栏目筛选"
        clearable
        placeholder="全部栏目"
      >
        <el-option
          v-for="item in categoryOptions"
          :key="item[0]"
          :label="item[1]"
          :value="item[0]"
        />
      </el-select>
      <div class="ui-toolbar__end">
        <el-button :icon="Search" type="primary" @click="search">查询</el-button>
        <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
      </div>
    </section>

    <section v-loading="loading" class="portal-admin-table-surface">
      <UiDataList
        :card-test-id="(row) => `portal-content-card-${row.id}`"
        :columns="tableColumns"
        :loading="loading"
        :rows="items"
        empty-text="暂无内容"
        test-id="portal-content-table"
      >
        <template #cell-title="{ row }">
          <div class="content-cell">
            <strong>{{ row.title }}</strong>
            <span>{{ categoryLabel(row) }} · {{ row.summary }}</span>
          </div>
        </template>
        <template #cell-status="{ row }">
          <el-tag :type="statusType(row)" effect="light">{{ statusLabel(row) }}</el-tag>
        </template>
        <template #cell-audience="{ row }">{{ audienceLabel(row) }}</template>
        <template #cell-currentRevision="{ row }">V{{ row.currentRevision }}</template>
        <template #cell-updatedAt="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
        <template #mobile-title="{ row }">
          <div class="content-cell">
            <strong>{{ row.title }}</strong>
            <span>{{ categoryLabel(row) }}</span>
          </div>
        </template>
        <template #mobile-summary="{ row }">
          <dl class="ui-record__facts">
            <div><dt>状态</dt><dd>{{ statusLabel(row) }}</dd></div>
            <div><dt>发布受众</dt><dd>{{ audienceLabel(row) }}</dd></div>
            <div><dt>更新时间</dt><dd>{{ formatDateTime(row.updatedAt) }}</dd></div>
            <div><dt>摘要</dt><dd>{{ row.summary }}</dd></div>
          </dl>
        </template>
        <template #actions="{ row }">
          <el-button
            v-if="row.status !== 'WITHDRAWN'"
            :data-testid="`portal-content-edit-${row.id}`"
            :icon="Edit"
            link
            @click="openEdit(row)"
            >编辑</el-button
          >
          <el-button
            v-if="row.status === 'DRAFT' || row.status === 'SCHEDULED'"
            :data-testid="`portal-content-publish-${row.id}`"
            :icon="Promotion"
            link
            @click="openPublish(row)"
            >发布</el-button
          >
          <el-button
            v-if="row.status === 'PUBLISHED' || row.status === 'SCHEDULED'"
            :data-testid="`portal-content-withdraw-${row.id}`"
            :icon="Remove"
            link
            @click="withdraw(row)"
            >撤回</el-button
          >
          <el-button
            :data-testid="`portal-content-audit-${row.id}`"
            :icon="Clock"
            link
            @click="openAudit(row)"
            >审计</el-button
          >
        </template>
      </UiDataList>

      <footer class="portal-admin-pagination">
        <span>共 {{ total }} 条</span>
        <el-pagination
          background
          :current-page="page"
          layout="prev, pager, next"
          :page-size="pageSize"
          :total="total"
          @current-change="changePage"
        />
      </footer>
    </section>

    <PortalContentEditorDrawer
      :content="editorContent"
      :directory="directory"
      :open="editorOpen"
      :saving="editorSaving"
      @close="editorOpen = false"
      @save="saveContent"
    />
    <PortalContentAuditDrawer
      :loading="auditLoading"
      :open="auditOpen"
      :title="auditTitle"
      :trail="auditTrail"
      @close="auditOpen = false"
    />

    <el-dialog
      v-model="publishOpen"
      data-testid="portal-content-publish-dialog"
      title="确认发布"
      width="min(520px, 94vw)"
    >
      <el-form label-position="top">
        <el-form-item label="发布方式">
          <el-radio-group v-model="publishMode" aria-label="发布方式">
            <el-radio-button value="NOW">立即发布</el-radio-button>
            <el-radio-button value="SCHEDULED">定时发布</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="publishMode === 'SCHEDULED'" label="发布时间">
          <el-date-picker
            ref="publishDatePicker"
            aria-label="定时发布时间"
            data-testid="portal-content-publish-at"
            format="YYYY-MM-DD HH:mm"
            :model-value="scheduledAt"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm"
            @update:model-value="updateScheduledAt"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="publishOpen = false">取消</el-button>
        <el-button
          data-testid="portal-content-confirm-publish"
          :loading="publishing"
          type="primary"
          @click="confirmPublish"
          >确认发布</el-button
        >
      </template>
    </el-dialog>
  </main>
</template>

<style scoped>
.portal-admin-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding-bottom: 20px; border-bottom: 1px solid var(--color-border); }
.portal-admin-header h1 { margin: 4px 0 0; font-size: 32px; font-weight: 600; }
.portal-admin-header span { color: var(--color-text-tertiary); font-size: 13px; }
.portal-admin-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid var(--color-border); border-bottom: 1px solid var(--color-border); }
.portal-admin-metrics > div { display: grid; min-height: 96px; align-content: center; gap: 4px; padding: 20px 24px 20px 0; border-left: 1px solid var(--color-border); }
.portal-admin-metrics > div:first-child { padding-left: 0; border-left: 0; }
.portal-admin-metrics > div:not(:first-child) { padding-left: 24px; }
.portal-admin-metrics span { color: var(--color-text-tertiary); font-size: 13px; }
.portal-admin-metrics strong { font-size: 28px; font-weight: 600; font-variant-numeric: tabular-nums; }
.portal-admin-table-surface { min-width: 0; }
.content-cell { display: grid; gap: 2px; min-width: 0; }
.content-cell strong { overflow: hidden; color: var(--color-text); font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.content-cell span { overflow: hidden; color: var(--color-text-tertiary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.portal-admin-pagination { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-top: 16px; color: var(--color-text-tertiary); font-size: 13px; }
.portal-content-admin-page[data-compact='true'] .portal-admin-header { flex-direction: column; }
.portal-content-admin-page[data-compact='true'] .portal-admin-header h1 { font-size: 24px; }
.portal-content-admin-page[data-compact='true'] .portal-admin-metrics { grid-template-columns: minmax(0, 1fr); }
.portal-content-admin-page[data-compact='true'] .portal-admin-metrics > div { min-height: 76px; padding: 14px 0; border-left: 0; border-top: 1px solid var(--color-border); }
.portal-content-admin-page[data-compact='true'] .portal-admin-metrics > div:first-child { border-top: 0; }
</style>
