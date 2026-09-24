<script setup lang="ts">
import { DocumentAdd, Refresh, Search, Stamp } from '@element-plus/icons-vue';
import type { DocumentSummary } from '@oa/contracts';
import { requiredBusinessModulePermissions } from '@oa/contracts';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AppPageHeader from '../../shared/components/AppPageHeader.vue';
import DocumentTable from '../../shared/components/DocumentTable.vue';
import WorkspaceFilterBar from '../../shared/components/WorkspaceFilterBar.vue';
import WorkspaceMetricStrip from '../../shared/components/WorkspaceMetricStrip.vue';
import { documentDetailPath } from '../../shared/document';
import { formatDate } from '../../shared/format';
import { useSessionStore } from '../../shared/session';
import { useWorkflowStore } from '../../shared/workflow';
import UiDataList from '../../ui/UiDataList.vue';
import UiPagination from '../../ui/UiPagination.vue';
import {
  getAssetStatusMeta,
  sealAssetStatusOptions,
  sealAssetTypeLabels,
  sealAssetTypeOptions,
  sealDocumentStatusOptions,
  sealDocumentTypeOptions,
} from './seal.constants';
import { useSealResources } from './useSealResources';

const router = useRouter();
const session = useSessionStore();
const workflow = useWorkflowStore();
const resources = useSealResources();
const activeTab = ref('documents');
const loading = ref(false);
const errorMessage = ref('');
interface WorkspaceFilters {
  keyword: string;
  type: string | undefined;
  status: string | undefined;
}

const documentFilters = reactive<WorkspaceFilters>({
  keyword: '',
  type: undefined,
  status: undefined,
});
const assetFilters = reactive<WorkspaceFilters>({
  keyword: '',
  type: undefined,
  status: undefined,
});
const createPermissions = requiredBusinessModulePermissions('SEAL', 'CREATE');
const canCreate = computed(() => createPermissions.every((code) => session.can(code)));

const sealDocuments = computed(() =>
  workflow.documents.filter((item) => ['SEAL_BORROW', 'SEAL_USE'].includes(item.documentType)),
);

const filteredDocuments = computed(() => {
  const keyword = documentFilters.keyword.trim().toLocaleLowerCase();
  return sealDocuments.value.filter((item) => {
    const matchesKeyword = !keyword || item.title.toLocaleLowerCase().includes(keyword);
    const matchesType = !documentFilters.type || item.documentType === documentFilters.type;
    const matchesStatus = !documentFilters.status || item.status === documentFilters.status;
    return matchesKeyword && matchesType && matchesStatus;
  });
});

const filteredAssets = computed(() => {
  const keyword = assetFilters.keyword.trim().toLocaleLowerCase();
  return resources.assets.value.filter((asset) => {
    const custodian = resources.userName(asset.custodianUserId);
    const text = `${asset.code} ${asset.name} ${custodian}`.toLocaleLowerCase();
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesType = !assetFilters.type || asset.type === assetFilters.type;
    const matchesStatus = !assetFilters.status || asset.status === assetFilters.status;
    return matchesKeyword && matchesType && matchesStatus;
  });
});
const metricItems = computed(() => [
  { key: 'documents', label: '申请单据', value: sealDocuments.value.length },
  {
    key: 'reviewing',
    label: '审批中',
    value: sealDocuments.value.filter((item) => item.status === 'IN_REVIEW').length,
  },
  {
    key: 'approved',
    label: '已通过申请',
    value: sealDocuments.value.filter((item) => item.status === 'APPROVED').length,
  },
  { key: 'assets', label: '在册资产', value: resources.assets.value.length },
]);
const hasDocumentFilters = computed(
  () =>
    documentFilters.keyword.trim().length > 0 || !!documentFilters.type || !!documentFilters.status,
);
const hasAssetFilters = computed(
  () => assetFilters.keyword.trim().length > 0 || !!assetFilters.type || !!assetFilters.status,
);

const assetColumns = [
  { key: 'asset', label: '印章证照', minWidth: 260 },
  { key: 'type', label: '类型', width: 100 },
  { key: 'custodian', label: '保管人', width: 140 },
  { key: 'status', label: '状态', width: 100 },
  { key: 'validUntil', label: '有效期', width: 130 },
];
const assetPage = ref(1);
const assetPageSize = ref(10);
const pagedAssets = computed(() =>
  filteredAssets.value.slice(
    (assetPage.value - 1) * assetPageSize.value,
    assetPage.value * assetPageSize.value,
  ),
);

watch(assetFilters, () => {
  assetPage.value = 1;
});
watch(
  () => [filteredAssets.value.length, assetPageSize.value],
  () => {
    assetPage.value = Math.min(
      assetPage.value,
      Math.max(1, Math.ceil(filteredAssets.value.length / assetPageSize.value)),
    );
  },
);

function setError(error: unknown): void {
  errorMessage.value = error instanceof Error ? error.message : '数据加载失败，请稍后重试';
}

async function loadData(): Promise<void> {
  loading.value = true;
  errorMessage.value = '';
  try {
    await Promise.all([workflow.refresh(), resources.load()]);
  } catch (error) {
    setError(error);
  } finally {
    loading.value = false;
  }
}

function resetDocumentFilters(): void {
  Object.assign(documentFilters, { keyword: '', type: undefined, status: undefined });
}

function resetAssetFilters(): void {
  Object.assign(assetFilters, { keyword: '', type: undefined, status: undefined });
}

function openDocument(document: DocumentSummary): void {
  const kind = document.documentType === 'SEAL_BORROW' ? 'borrow' : 'use';
  const canExecute = document.status === 'APPROVED' && session.can('SEAL_EXECUTE');
  const canEdit =
    canCreate.value &&
    document.applicantId === session.user?.id &&
    ['DRAFT', 'RETURNED'].includes(document.status);
  const path = canExecute
    ? `/seal/execution/${document.documentType}/${document.id}`
    : canEdit
      ? `/seal/${kind}/${document.id}/edit`
      : documentDetailPath(document.documentType, document.id);
  void router.push(path);
}

onMounted(loadData);
</script>

<template>
  <div class="ui-page seal-workspace">
    <AppPageHeader
      description="统一查看用印、外借申请和印章证照台账。"
      eyebrow="行政管理"
      title="行政印章"
    >
      <template #actions>
        <div class="ui-actions">
          <el-button
            v-if="canCreate"
            type="primary"
            :icon="DocumentAdd"
            @click="router.push('/seal/use/new')"
          >
            新建用印申请
          </el-button>
          <el-button v-if="canCreate" :icon="Stamp" @click="router.push('/seal/borrow/new')">
            新建外借申请
          </el-button>
          <el-button
            aria-label="刷新"
            :icon="Refresh"
            :loading="loading || workflow.loading"
            @click="loadData"
          >
            刷新
          </el-button>
        </div>
      </template>
    </AppPageHeader>

    <el-alert v-if="errorMessage" :closable="false" :title="errorMessage" show-icon type="error" />

    <WorkspaceMetricStrip :items="metricItems" label="印章业务统计" />

    <el-tabs v-model="activeTab" class="seal-workspace__tabs">
      <el-tab-pane label="申请单据" name="documents">
        <WorkspaceFilterBar
          label="印章申请筛选"
          :result-label="`共 ${filteredDocuments.length} 条`"
        >
          <template #search>
            <el-input
              v-model="documentFilters.keyword"
              aria-label="搜索单据标题"
              clearable
              placeholder="搜索单据标题"
              :prefix-icon="Search"
            />
          </template>
          <template #filters>
            <el-select
              v-model="documentFilters.type"
              aria-label="申请类型"
              clearable
              placeholder="全部申请类型"
            >
              <el-option
                v-for="option in sealDocumentTypeOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
            <el-select
              v-model="documentFilters.status"
              aria-label="审批状态"
              clearable
              placeholder="全部审批状态"
            >
              <el-option
                v-for="option in sealDocumentStatusOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </template>
          <template v-if="hasDocumentFilters" #actions>
            <el-button @click="resetDocumentFilters">清空筛选</el-button>
          </template>
        </WorkspaceFilterBar>

        <DocumentTable
          :documents="filteredDocuments"
          :loading="loading || workflow.loading"
          @open="openDocument"
        />
      </el-tab-pane>

      <el-tab-pane label="印章证照台账" name="assets">
        <WorkspaceFilterBar label="印章证照筛选" :result-label="`共 ${filteredAssets.length} 条`">
          <template #search>
            <el-input
              v-model="assetFilters.keyword"
              aria-label="搜索印章证照"
              clearable
              placeholder="搜索名称、编号或保管人"
              :prefix-icon="Search"
            />
          </template>
          <template #filters>
            <el-select
              v-model="assetFilters.type"
              aria-label="资产类型"
              clearable
              placeholder="全部资产类型"
            >
              <el-option
                v-for="option in sealAssetTypeOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
            <el-select
              v-model="assetFilters.status"
              aria-label="资产状态"
              clearable
              placeholder="全部资产状态"
            >
              <el-option
                v-for="option in sealAssetStatusOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </template>
          <template v-if="hasAssetFilters" #actions>
            <el-button @click="resetAssetFilters">清空筛选</el-button>
          </template>
        </WorkspaceFilterBar>

        <UiDataList
          :columns="assetColumns"
          empty-text="暂无符合条件的印章证照"
          :loading="loading || resources.loading.value"
          :rows="pagedAssets"
        >
          <template #cell-asset="{ row }">
            <div class="seal-asset-identity">
              <strong>{{ row.name }}</strong>
              <span>{{ row.code }}</span>
            </div>
          </template>
          <template #cell-type="{ row }">
            {{ sealAssetTypeLabels[row.type] ?? row.type }}
          </template>
          <template #cell-custodian="{ row }">
            {{ resources.userName(row.custodianUserId) }}
          </template>
          <template #cell-status="{ row }">
            <el-tag :type="getAssetStatusMeta(row.status).color" effect="light">
              {{ getAssetStatusMeta(row.status).label }}
            </el-tag>
          </template>
          <template #cell-validUntil="{ row }">
            {{ formatDate(row.validUntil) }}
          </template>
          <template #mobile-title="{ row }">
            <div class="seal-asset-row__header">
              <strong>{{ row.name }}</strong>
              <el-tag :type="getAssetStatusMeta(row.status).color" effect="light">
                {{ getAssetStatusMeta(row.status).label }}
              </el-tag>
            </div>
          </template>
          <template #mobile-summary="{ row }">
            <dl class="ui-record__facts">
              <div>
                <dt>类型</dt>
                <dd>{{ sealAssetTypeLabels[row.type] ?? row.type }}</dd>
              </div>
              <div>
                <dt>编号</dt>
                <dd>{{ row.code }}</dd>
              </div>
              <div>
                <dt>保管人</dt>
                <dd>{{ resources.userName(row.custodianUserId) }}</dd>
              </div>
              <div>
                <dt>有效期</dt>
                <dd>{{ formatDate(row.validUntil) }}</dd>
              </div>
            </dl>
          </template>
        </UiDataList>
        <UiPagination
          v-if="filteredAssets.length > 0"
          v-model:page="assetPage"
          v-model:page-size="assetPageSize"
          :page-sizes="[10, 20, 50]"
          :total="filteredAssets.length"
        />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.seal-workspace {
  min-width: 0;
}

.seal-workspace__tabs {
  margin-top: 0;
}

.seal-asset-identity {
  display: grid;
  gap: 3px;
}

.seal-asset-identity span {
  color: var(--color-text-secondary);
}

.seal-asset-row__header {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  min-width: 0;
}

.seal-asset-row__header strong {
  min-width: 0;
  overflow-wrap: anywhere;
}

.seal-asset-row__header :deep(.el-tag) {
  flex: 0 0 auto;
}
</style>
