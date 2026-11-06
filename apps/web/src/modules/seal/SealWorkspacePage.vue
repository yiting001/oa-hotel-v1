<script setup lang="ts">
import { DocumentAdd, Refresh, Search } from '@element-plus/icons-vue';
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
  sealDocumentStatusOptions,
} from './seal.constants';
import { useSealResources } from './useSealResources';

const props = withDefaults(defineProps<{ scope?: 'seal' | 'license' }>(), { scope: 'seal' });
const router = useRouter();
const session = useSessionStore();
const workflow = useWorkflowStore();
const resources = useSealResources();
const activeTab = ref('documents');
const loading = ref(false);
const errorMessage = ref('');
interface WorkspaceFilters {
  keyword: string;
  status: string | undefined;
}

/** 印章申请与证照申请共用本页：每个入口只保留本页自己的新建按钮。 */
const scopeCopy = computed(() =>
  props.scope === 'license'
    ? {
        title: '证照申请',
        description: '统一查看证照借用申请和证照台账。',
        entryLabel: '证照编号或名称',
        documentTypes: ['SEAL_BORROW'],
        assetType: 'LICENSE',
        assetLabel: '证照',
        createPath: '/seal/borrow/new',
        createLabel: '新建借用申请',
      }
    : {
        title: '印章申请',
        description: '统一查看印章申请和印章台账。',
        entryLabel: '印章名称',
        documentTypes: ['SEAL_USE'],
        assetType: 'SEAL',
        assetLabel: '印章',
        createPath: '/seal/use/new',
        createLabel: '新建申请',
      },
);

const documentFilters = reactive<WorkspaceFilters>({
  keyword: '',
  status: undefined,
});
const assetFilters = reactive<WorkspaceFilters>({
  keyword: '',
  status: undefined,
});
const createPermissions = requiredBusinessModulePermissions('SEAL', 'CREATE');
const canCreate = computed(() => createPermissions.every((code) => session.can(code)));

const scopedDocuments = computed(() =>
  workflow.documents.filter((item) => scopeCopy.value.documentTypes.includes(item.documentType)),
);

const filteredDocuments = computed(() => {
  const keyword = documentFilters.keyword.trim().toLocaleLowerCase();
  return scopedDocuments.value.filter((item) => {
    const matchesKeyword = !keyword || item.title.toLocaleLowerCase().includes(keyword);
    const matchesStatus = !documentFilters.status || item.status === documentFilters.status;
    return matchesKeyword && matchesStatus;
  });
});

const scopedAssets = computed(() =>
  resources.assets.value.filter((asset) => asset.type === scopeCopy.value.assetType),
);
const filteredAssets = computed(() => {
  const keyword = assetFilters.keyword.trim().toLocaleLowerCase();
  return scopedAssets.value.filter((asset) => {
    const custodian = resources.userName(asset.custodianUserId);
    const text = `${asset.code} ${asset.name} ${custodian}`.toLocaleLowerCase();
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesStatus = !assetFilters.status || asset.status === assetFilters.status;
    return matchesKeyword && matchesStatus;
  });
});
const metricItems = computed(() => [
  { key: 'documents', label: '申请单据', value: scopedDocuments.value.length },
  {
    key: 'reviewing',
    label: '审批中',
    value: scopedDocuments.value.filter((item) => item.status === 'IN_REVIEW').length,
  },
  {
    key: 'approved',
    label: '已通过申请',
    value: scopedDocuments.value.filter((item) => item.status === 'APPROVED').length,
  },
  { key: 'assets', label: `在册${scopeCopy.value.assetLabel}`, value: scopedAssets.value.length },
]);
const hasDocumentFilters = computed(
  () => documentFilters.keyword.trim().length > 0 || !!documentFilters.status,
);
const hasAssetFilters = computed(
  () => assetFilters.keyword.trim().length > 0 || !!assetFilters.status,
);

const assetColumns = computed(() => [
  { key: 'asset', label: scopeCopy.value.assetLabel, minWidth: 260 },
  { key: 'type', label: '类型', width: 100 },
  { key: 'custodian', label: '保管人', width: 140 },
  { key: 'status', label: '状态', width: 100 },
  { key: 'validUntil', label: '有效期', width: 130 },
]);
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
  Object.assign(documentFilters, { keyword: '', status: undefined });
}

function resetAssetFilters(): void {
  Object.assign(assetFilters, { keyword: '', status: undefined });
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
      :description="scopeCopy.description"
      eyebrow="行政管理"
      :title="scopeCopy.title"
    >
      <template #actions>
        <div class="ui-actions">
          <el-button
            v-if="canCreate"
            type="primary"
            :icon="DocumentAdd"
            @click="router.push(scopeCopy.createPath)"
          >
            {{ scopeCopy.createLabel }}
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

    <WorkspaceMetricStrip :items="metricItems" :label="`${scopeCopy.title}统计`" />

    <el-tabs v-model="activeTab" class="seal-workspace__tabs">
      <el-tab-pane label="申请单据" name="documents">
        <WorkspaceFilterBar
          :label="`${scopeCopy.title}筛选`"
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

      <el-tab-pane :label="`${scopeCopy.assetLabel}台账`" name="assets">
        <WorkspaceFilterBar
          :label="`${scopeCopy.assetLabel}筛选`"
          :result-label="`共 ${filteredAssets.length} 条`"
        >
          <template #search>
            <el-input
              v-model="assetFilters.keyword"
              :aria-label="`搜索${scopeCopy.assetLabel}`"
              clearable
              placeholder="搜索名称、编号或保管人"
              :prefix-icon="Search"
            />
          </template>
          <template #filters>
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
          :empty-text="`暂无符合条件的${scopeCopy.assetLabel}`"
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
