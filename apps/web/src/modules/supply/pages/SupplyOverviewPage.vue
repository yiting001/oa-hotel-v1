<script setup lang="ts">
import {
  ClearOutlined,
  EyeOutlined,
  FileAddOutlined,
  ReloadOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons-vue';
import type { DocumentStatus, DocumentSummary, DocumentType } from '@oa/contracts';
import { requiredBusinessModulePermissions } from '@oa/contracts';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import DocumentTable from '../../../shared/components/DocumentTable.vue';
import WorkspaceFilterBar from '../../../shared/components/WorkspaceFilterBar.vue';
import WorkspaceMetricStrip from '../../../shared/components/WorkspaceMetricStrip.vue';
import { documentDetailPath } from '../../../shared/document';
import { useSessionStore } from '../../../shared/session';
import { useWorkflowStore } from '../../../shared/workflow';
import { supplyRouteNames } from '../route-names';
import { supplyApi } from '../supply-api';
import type { MaterialItem } from '../types';

const router = useRouter();
const session = useSessionStore();
const workflow = useWorkflowStore();

const materials = ref<MaterialItem[]>([]);
const loadingMaterials = ref(false);
const pageError = ref('');
const materialKeyword = ref('');
const stockFilter = ref<'ALL' | 'AVAILABLE' | 'EMPTY'>('ALL');
const documentKeyword = ref('');
const documentType = ref<'ALL' | DocumentType>('ALL');
const documentStatus = ref<'ALL' | DocumentStatus>('ALL');
const selectedMaterial = ref<MaterialItem | null>(null);
const createPermissions = requiredBusinessModulePermissions('SUPPLY', 'CREATE');
const canCreate = computed(() => createPermissions.every((code) => session.can(code)));

const supplyDocuments = computed(() =>
  workflow.documents.filter((document) => document.module === 'SUPPLY'),
);
const purchaseCount = computed(
  () =>
    supplyDocuments.value.filter((document) => document.documentType === 'MATERIAL_PURCHASE')
      .length,
);
const requisitionCount = computed(
  () =>
    supplyDocuments.value.filter((document) => document.documentType === 'MATERIAL_REQUISITION')
      .length,
);
const emptyStockCount = computed(
  () => materials.value.filter((item) => Number(item.availableQuantity) <= 0).length,
);
const metricItems = computed(() => [
  { key: 'catalog', label: '目录项目', value: materials.value.length },
  { key: 'empty', label: '无可用库存', value: emptyStockCount.value },
  { key: 'purchases', label: '本人申购单', value: purchaseCount.value },
  { key: 'requisitions', label: '本人领用单', value: requisitionCount.value },
]);
const hasMaterialFilters = computed(
  () => Boolean(materialKeyword.value.trim()) || stockFilter.value !== 'ALL',
);
const hasDocumentFilters = computed(
  () =>
    Boolean(documentKeyword.value.trim()) ||
    documentType.value !== 'ALL' ||
    documentStatus.value !== 'ALL',
);
const filteredMaterials = computed(() => {
  const keyword = materialKeyword.value.trim().toLocaleLowerCase();
  return materials.value.filter((item) => {
    const matchesKeyword =
      !keyword ||
      [item.code, item.name, item.specification, item.unit].some((value) =>
        value.toLocaleLowerCase().includes(keyword),
      );
    const quantity = Number(item.availableQuantity);
    const matchesStock =
      stockFilter.value === 'ALL' ||
      (stockFilter.value === 'AVAILABLE' && quantity > 0) ||
      (stockFilter.value === 'EMPTY' && quantity <= 0);
    return matchesKeyword && matchesStock;
  });
});
const filteredDocuments = computed(() => {
  const keyword = documentKeyword.value.trim().toLocaleLowerCase();
  return supplyDocuments.value.filter((document) => {
    const matchesKeyword = !keyword || document.title.toLocaleLowerCase().includes(keyword);
    const matchesType =
      documentType.value === 'ALL' || document.documentType === documentType.value;
    const matchesStatus =
      documentStatus.value === 'ALL' || document.status === documentStatus.value;
    return matchesKeyword && matchesType && matchesStatus;
  });
});

const inventoryColumns = [
  { title: '货物编号', dataIndex: 'code', key: 'code', width: 150 },
  { title: '品名', dataIndex: 'name', key: 'name' },
  { title: '规格', dataIndex: 'specification', key: 'specification' },
  { title: '单位', dataIndex: 'unit', key: 'unit', width: 90 },
  { title: '可用库存', dataIndex: 'availableQuantity', key: 'availableQuantity', width: 120 },
  { title: '状态', dataIndex: 'active', key: 'active', width: 100 },
  { title: '操作', key: 'actions', width: 88 },
];

onMounted(() => {
  void refresh();
});

async function refresh(): Promise<void> {
  loadingMaterials.value = true;
  pageError.value = '';
  try {
    await session.ensureSession();
    const [inventory] = await Promise.all([supplyApi.listItems(), workflow.refresh()]);
    materials.value = inventory;
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : '物资台账加载失败';
  } finally {
    loadingMaterials.value = false;
  }
}

function openDocument(document: DocumentSummary): void {
  const canEdit =
    canCreate.value &&
    document.applicantId === session.user?.id &&
    ['DRAFT', 'RETURNED'].includes(document.status);
  if (!canEdit) {
    void router.push(documentDetailPath(document.documentType, document.id));
    return;
  }
  const name =
    document.documentType === 'MATERIAL_PURCHASE'
      ? supplyRouteNames.purchaseEdit
      : supplyRouteNames.requisitionEdit;
  void router.push({ name, params: { id: document.id } });
}

function resetMaterialFilters(): void {
  materialKeyword.value = '';
  stockFilter.value = 'ALL';
}

function resetDocumentFilters(): void {
  documentKeyword.value = '';
  documentType.value = 'ALL';
  documentStatus.value = 'ALL';
}
</script>

<template>
  <div class="supply-overview">
    <AppPageHeader
      description="统一查看物资目录、可用库存和本人发起的申购及领用单据。"
      eyebrow="物资管理"
      title="物资申购与领用"
    >
      <template #actions>
        <a-space wrap>
          <a-button
            v-if="canCreate"
            type="primary"
            @click="router.push({ name: supplyRouteNames.purchaseCreate })"
          >
            <template #icon><ShoppingCartOutlined /></template>
            新建申购
          </a-button>
          <a-button
            v-if="canCreate"
            @click="router.push({ name: supplyRouteNames.requisitionCreate })"
          >
            <template #icon><FileAddOutlined /></template>
            新建领用
          </a-button>
          <a-button
            aria-label="刷新"
            :loading="loadingMaterials || workflow.loading"
            @click="refresh"
          >
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
        </a-space>
      </template>
    </AppPageHeader>

    <a-alert v-if="pageError" class="page-alert" :message="pageError" show-icon type="error" />

    <WorkspaceMetricStrip :items="metricItems" label="物资业务统计" />

    <a-tabs default-active-key="inventory" size="large">
      <a-tab-pane key="inventory" tab="物资目录与库存">
        <WorkspaceFilterBar
          label="物资目录筛选"
          :result-label="`共 ${filteredMaterials.length} 条`"
        >
          <template #search>
            <a-input
              v-model:value="materialKeyword"
              allow-clear
              placeholder="搜索货物编号、品名、规格或单位"
            >
              <template #prefix><SearchOutlined /></template>
            </a-input>
          </template>
          <template #filters>
            <a-select v-model:value="stockFilter" aria-label="库存状态">
              <a-select-option value="ALL">全部库存</a-select-option>
              <a-select-option value="AVAILABLE">有可用库存</a-select-option>
              <a-select-option value="EMPTY">无可用库存</a-select-option>
            </a-select>
          </template>
          <template v-if="hasMaterialFilters" #actions>
            <a-button @click="resetMaterialFilters">
              <template #icon><ClearOutlined /></template>
              清空筛选
            </a-button>
          </template>
        </WorkspaceFilterBar>

        <div class="inventory-table-desktop">
          <a-table
            :columns="inventoryColumns"
            :data-source="filteredMaterials"
            :loading="loadingMaterials"
            :locale="{ emptyText: '暂无符合条件的物资' }"
            :pagination="{ pageSize: 10, showTotal: (total: number) => `共 ${total} 条` }"
            row-key="id"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'code'">
                <button class="table-link" type="button" @click="selectedMaterial = record">
                  {{ record.code }}
                </button>
              </template>
              <template v-else-if="column.key === 'availableQuantity'">
                <span :class="{ 'stock-empty': Number(record.availableQuantity) <= 0 }">
                  {{ record.availableQuantity }} {{ record.unit }}
                </span>
              </template>
              <template v-else-if="column.key === 'active'">
                <a-badge
                  :status="record.active ? 'success' : 'default'"
                  :text="record.active ? '启用' : '停用'"
                />
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-tooltip title="查看物资详情">
                  <a-button
                    :aria-label="`查看${record.name}`"
                    shape="circle"
                    type="text"
                    @click="selectedMaterial = record"
                  >
                    <template #icon><EyeOutlined /></template>
                  </a-button>
                </a-tooltip>
              </template>
            </template>
          </a-table>
        </div>

        <div class="inventory-cards-mobile">
          <a-empty
            v-if="!loadingMaterials && filteredMaterials.length === 0"
            description="暂无符合条件的物资"
          />
          <article
            v-for="material in filteredMaterials"
            :key="material.id"
            class="inventory-card"
            role="button"
            tabindex="0"
            @click="selectedMaterial = material"
            @keydown.enter="selectedMaterial = material"
          >
            <header>
              <strong>{{ material.name }}</strong
              ><span>{{ material.code }}</span>
            </header>
            <p>{{ material.specification }}</p>
            <footer>
              <a-badge
                :status="material.active ? 'success' : 'default'"
                :text="material.active ? '启用' : '停用'"
              />
              <strong :class="{ 'stock-empty': Number(material.availableQuantity) <= 0 }">
                可用 {{ material.availableQuantity }} {{ material.unit }}
              </strong>
            </footer>
          </article>
        </div>
      </a-tab-pane>

      <a-tab-pane key="documents" tab="我的物资单据">
        <WorkspaceFilterBar
          label="物资单据筛选"
          :result-label="`共 ${filteredDocuments.length} 条`"
        >
          <template #search>
            <a-input v-model:value="documentKeyword" allow-clear placeholder="搜索单据标题">
              <template #prefix><SearchOutlined /></template>
            </a-input>
          </template>
          <template #filters>
            <a-select v-model:value="documentType" aria-label="单据类型">
              <a-select-option value="ALL">全部类型</a-select-option>
              <a-select-option value="MATERIAL_PURCHASE">物资申购</a-select-option>
              <a-select-option value="MATERIAL_REQUISITION">物资领用</a-select-option>
            </a-select>
            <a-select v-model:value="documentStatus" aria-label="单据状态">
              <a-select-option value="ALL">全部状态</a-select-option>
              <a-select-option value="DRAFT">草稿</a-select-option>
              <a-select-option value="IN_REVIEW">审批中</a-select-option>
              <a-select-option value="RETURNED">已退回</a-select-option>
              <a-select-option value="APPROVED">已通过</a-select-option>
              <a-select-option value="CANCELLED">已取消</a-select-option>
            </a-select>
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
          :loading="workflow.loading"
          @open="openDocument"
        />
      </a-tab-pane>
    </a-tabs>

    <a-drawer
      :open="selectedMaterial !== null"
      title="物资目录详情"
      :width="420"
      @close="selectedMaterial = null"
    >
      <a-descriptions v-if="selectedMaterial" :column="1" bordered size="small">
        <a-descriptions-item label="货物编号">{{ selectedMaterial.code }}</a-descriptions-item>
        <a-descriptions-item label="品名">{{ selectedMaterial.name }}</a-descriptions-item>
        <a-descriptions-item label="规格">{{ selectedMaterial.specification }}</a-descriptions-item>
        <a-descriptions-item label="单位">{{ selectedMaterial.unit }}</a-descriptions-item>
        <a-descriptions-item label="可用库存">
          {{ selectedMaterial.availableQuantity }} {{ selectedMaterial.unit }}
        </a-descriptions-item>
        <a-descriptions-item label="目录状态">
          {{ selectedMaterial.active ? '启用' : '停用' }}
        </a-descriptions-item>
      </a-descriptions>
    </a-drawer>
  </div>
</template>

<style scoped>
.supply-overview {
  min-width: 0;
}

.page-alert {
  margin-bottom: 16px;
}

.stock-empty {
  color: var(--color-danger);
  font-weight: 600;
}

.inventory-cards-mobile {
  display: none;
}

@media (max-width: 767px) {
  .inventory-table-desktop {
    display: none;
  }

  .inventory-cards-mobile {
    display: grid;
    gap: 10px;
  }

  .inventory-card {
    border: 1px solid var(--color-border-strong);
    border-radius: 6px;
    cursor: pointer;
    padding: 14px;
  }

  .inventory-card header,
  .inventory-card footer {
    align-items: center;
    display: flex;
    gap: 12px;
    justify-content: space-between;
  }

  .inventory-card header span,
  .inventory-card p {
    color: var(--color-text-secondary);
    font-size: 13px;
  }

  .inventory-card p {
    margin: 8px 0 14px;
  }

  .inventory-card footer strong {
    font-size: 13px;
  }
}
</style>
