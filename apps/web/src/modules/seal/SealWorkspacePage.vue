<script setup lang="ts">
import {
  ClearOutlined,
  FileAddOutlined,
  IdcardOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';
import type { DocumentSummary } from '@oa/contracts';
import { requiredBusinessModulePermissions } from '@oa/contracts';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppPageHeader from '../../shared/components/AppPageHeader.vue';
import DocumentTable from '../../shared/components/DocumentTable.vue';
import WorkspaceFilterBar from '../../shared/components/WorkspaceFilterBar.vue';
import WorkspaceMetricStrip from '../../shared/components/WorkspaceMetricStrip.vue';
import { documentDetailPath } from '../../shared/document';
import { formatDate } from '../../shared/format';
import { useSessionStore } from '../../shared/session';
import { useWorkflowStore } from '../../shared/workflow';
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
  { title: '印章证照', key: 'asset', width: 260 },
  { title: '类型', dataIndex: 'type', key: 'type', width: 100 },
  { title: '保管人', dataIndex: 'custodianUserId', key: 'custodian', width: 140 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '有效期', dataIndex: 'validUntil', key: 'validUntil', width: 130 },
];

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
  <div class="seal-workspace">
    <AppPageHeader
      description="统一查看用印、外借申请和印章证照台账。"
      eyebrow="行政管理"
      title="行政印章"
    >
      <template #actions>
        <a-space wrap>
          <a-button v-if="canCreate" type="primary" @click="router.push('/seal/use/new')">
            <template #icon><FileAddOutlined /></template>
            新建用印申请
          </a-button>
          <a-button v-if="canCreate" @click="router.push('/seal/borrow/new')">
            <template #icon><SafetyCertificateOutlined /></template>
            新建外借申请
          </a-button>
          <a-button aria-label="刷新" :loading="loading || workflow.loading" @click="loadData">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
        </a-space>
      </template>
    </AppPageHeader>

    <a-alert
      v-if="errorMessage"
      :message="errorMessage"
      closable
      show-icon
      type="error"
      @close="errorMessage = ''"
    />

    <WorkspaceMetricStrip :items="metricItems" label="印章业务统计" />

    <a-tabs v-model:active-key="activeTab" class="seal-workspace__tabs">
      <a-tab-pane key="documents">
        <template #tab><FileAddOutlined /> 申请单据</template>

        <WorkspaceFilterBar
          label="印章申请筛选"
          :result-label="`共 ${filteredDocuments.length} 条`"
        >
          <template #search>
            <a-input v-model:value="documentFilters.keyword" allow-clear placeholder="搜索单据标题">
              <template #prefix><SearchOutlined /></template>
            </a-input>
          </template>
          <template #filters>
            <a-select
              v-model:value="documentFilters.type"
              aria-label="申请类型"
              :options="sealDocumentTypeOptions"
              allow-clear
              placeholder="全部申请类型"
            />
            <a-select
              v-model:value="documentFilters.status"
              aria-label="审批状态"
              :options="sealDocumentStatusOptions"
              allow-clear
              placeholder="全部审批状态"
            />
          </template>
          <template v-if="hasDocumentFilters" #actions>
            <a-button @click="resetDocumentFilters">
              <template #icon><ClearOutlined /></template>
              清空筛选
            </a-button>
          </template>
        </WorkspaceFilterBar>

        <DocumentTable
          :documents="filteredDocuments"
          :loading="loading || workflow.loading"
          @open="openDocument"
        />
      </a-tab-pane>

      <a-tab-pane key="assets">
        <template #tab><IdcardOutlined /> 印章证照台账</template>

        <WorkspaceFilterBar label="印章证照筛选" :result-label="`共 ${filteredAssets.length} 条`">
          <template #search>
            <a-input
              v-model:value="assetFilters.keyword"
              allow-clear
              placeholder="搜索名称、编号或保管人"
            >
              <template #prefix><SearchOutlined /></template>
            </a-input>
          </template>
          <template #filters>
            <a-select
              v-model:value="assetFilters.type"
              aria-label="资产类型"
              :options="sealAssetTypeOptions"
              allow-clear
              placeholder="全部资产类型"
            />
            <a-select
              v-model:value="assetFilters.status"
              aria-label="资产状态"
              :options="sealAssetStatusOptions"
              allow-clear
              placeholder="全部资产状态"
            />
          </template>
          <template v-if="hasAssetFilters" #actions>
            <a-button @click="resetAssetFilters">
              <template #icon><ClearOutlined /></template>
              清空筛选
            </a-button>
          </template>
        </WorkspaceFilterBar>

        <div class="seal-assets--desktop">
          <a-table
            :columns="assetColumns"
            :data-source="filteredAssets"
            :loading="loading || resources.loading.value"
            :locale="{ emptyText: '暂无符合条件的印章证照' }"
            :pagination="{ pageSize: 10, showTotal: (total: number) => `共 ${total} 条` }"
            :scroll="{ x: 760 }"
            row-key="id"
            size="middle"
          >
            <template #bodyCell="{ column, record: asset }">
              <template v-if="column.key === 'asset'">
                <div class="seal-asset-identity">
                  <strong>{{ asset.name }}</strong>
                  <span>{{ asset.code }}</span>
                </div>
              </template>
              <template v-else-if="column.key === 'type'">
                {{ sealAssetTypeLabels[asset.type] ?? asset.type }}
              </template>
              <template v-else-if="column.key === 'custodian'">
                {{ resources.userName(asset.custodianUserId) }}
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="getAssetStatusMeta(asset.status).color">
                  {{ getAssetStatusMeta(asset.status).label }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'validUntil'">
                {{ formatDate(asset.validUntil) }}
              </template>
            </template>
          </a-table>
        </div>

        <div class="seal-assets--mobile">
          <a-empty
            v-if="!loading && filteredAssets.length === 0"
            description="暂无符合条件的印章证照"
          />
          <article v-for="asset in filteredAssets" :key="asset.id" class="seal-asset-row">
            <div class="seal-asset-row__header">
              <strong>{{ asset.name }}</strong>
              <a-tag :color="getAssetStatusMeta(asset.status).color">
                {{ getAssetStatusMeta(asset.status).label }}
              </a-tag>
            </div>
            <span>{{ asset.code }} · {{ sealAssetTypeLabels[asset.type] ?? asset.type }}</span>
            <small>
              保管人 {{ resources.userName(asset.custodianUserId) }} · 有效期
              {{ formatDate(asset.validUntil) }}
            </small>
          </article>
        </div>
      </a-tab-pane>
    </a-tabs>
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

.seal-asset-identity span,
.seal-asset-row small,
.seal-asset-row > span {
  color: var(--color-text-secondary);
}

.seal-assets--mobile {
  display: none;
}

.seal-asset-row {
  border-bottom: 1px solid var(--color-border);
  display: grid;
  gap: 6px;
  padding: 14px 0;
}

.seal-asset-row__header {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.seal-asset-row__header strong {
  min-width: 0;
  overflow-wrap: anywhere;
}

.seal-asset-row__header :deep(.ant-tag) {
  flex: 0 0 auto;
}

@media (max-width: 767px) {
  .seal-assets--desktop {
    display: none;
  }

  .seal-assets--mobile {
    display: block;
  }
}
</style>
