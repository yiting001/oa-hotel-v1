<script setup lang="ts">
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
  <main class="portal-content-admin-page">
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

    <section class="portal-admin-toolbar" aria-label="内容筛选">
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
      <el-button :icon="Search" type="primary" @click="search">查询</el-button>
      <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
    </section>

    <section v-loading="loading" class="portal-admin-table-surface">
      <el-table :data="items" data-testid="portal-content-table" row-key="id">
        <el-table-column label="内容" min-width="280">
          <template #default="{ row }">
            <div class="portal-admin-content-cell">
              <strong>{{ row.title }}</strong>
              <span>{{ categoryLabel(row) }} · {{ row.summary }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="112">
          <template #default="{ row }">
            <el-tag :type="statusType(row)" effect="light">{{ statusLabel(row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发布受众" min-width="150">
          <template #default="{ row }">{{ audienceLabel(row) }}</template>
        </el-table-column>
        <el-table-column label="修订" width="78">
          <template #default="{ row }">V{{ row.currentRevision }}</template>
        </el-table-column>
        <el-table-column label="更新时间" width="168">
          <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="250">
          <template #default="{ row }">
            <div class="portal-admin-actions">
              <el-button
                v-if="row.status !== 'WITHDRAWN'"
                :data-testid="`portal-content-edit-${row.id}`"
                :icon="Edit"
                link
                type="primary"
                @click="openEdit(row)"
                >编辑</el-button
              >
              <el-button
                v-if="row.status === 'DRAFT' || row.status === 'SCHEDULED'"
                :data-testid="`portal-content-publish-${row.id}`"
                :icon="Promotion"
                link
                type="success"
                @click="openPublish(row)"
                >发布</el-button
              >
              <el-button
                v-if="row.status === 'PUBLISHED' || row.status === 'SCHEDULED'"
                :data-testid="`portal-content-withdraw-${row.id}`"
                :icon="Remove"
                link
                type="danger"
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
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="portal-admin-mobile-list">
        <article
          v-for="item in items"
          :key="item.id"
          :data-testid="`portal-content-card-${item.id}`"
        >
          <header>
            <div>
              <strong>{{ item.title }}</strong
              ><span>{{ portalCategoryLabels[item.category] }}</span>
            </div>
            <el-tag :type="statusMeta[item.status].type" size="small">{{
              statusMeta[item.status].label
            }}</el-tag>
          </header>
          <p>{{ item.summary }}</p>
          <dl>
            <dt>发布受众</dt>
            <dd>{{ audienceLabel(item) }}</dd>
            <dt>更新时间</dt>
            <dd>{{ formatDateTime(item.updatedAt) }}</dd>
          </dl>
          <div class="portal-admin-actions">
            <el-button
              v-if="item.status !== 'WITHDRAWN'"
              :data-testid="`portal-content-edit-mobile-${item.id}`"
              :icon="Edit"
              @click="openEdit(item)"
              >编辑</el-button
            >
            <el-button
              v-if="item.status === 'DRAFT' || item.status === 'SCHEDULED'"
              :data-testid="`portal-content-publish-mobile-${item.id}`"
              :icon="Promotion"
              @click="openPublish(item)"
              >发布</el-button
            >
            <el-button
              v-if="item.status === 'PUBLISHED' || item.status === 'SCHEDULED'"
              :data-testid="`portal-content-withdraw-mobile-${item.id}`"
              :icon="Remove"
              @click="withdraw(item)"
              >撤回</el-button
            >
            <el-button
              :data-testid="`portal-content-audit-mobile-${item.id}`"
              :icon="Clock"
              @click="openAudit(item)"
              >审计</el-button
            >
          </div>
        </article>
      </div>

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
