<script setup lang="ts">
import WorkspaceFilterBar from '../../../shared/components/WorkspaceFilterBar.vue';
import { Refresh, Plus, Search } from '@element-plus/icons-vue';
import type { DocumentStatus, DocumentSummary, DocumentType } from '@oa/contracts';
import { requiredBusinessModulePermissions } from '@oa/contracts';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import StatusTag from '../../../shared/components/StatusTag.vue';
import WorkspaceMetricStrip from '../../../shared/components/WorkspaceMetricStrip.vue';
import { documentDetailPath, documentTypeMeta } from '../../../shared/document';
import { formatDateTime } from '../../../shared/format';
import { useSessionStore } from '../../../shared/session';
import { useWorkflowStore } from '../../../shared/workflow';
import UiDataList from '../../../ui/UiDataList.vue';
import UiDialog from '../../../ui/UiDialog.vue';
import UiPagination from '../../../ui/UiPagination.vue';
import { supplyRouteNames } from '../route-names';
import { supplyApi } from '../supply-api';
import type { MaterialItem } from '../types';

const router = useRouter();
const session = useSessionStore();
const workflow = useWorkflowStore();
const activeTab = ref('inventory');
const materials = ref<MaterialItem[]>([]);
const loadingMaterials = ref(false);
const pageError = ref('');
const materialKeyword = ref('');
const stockFilter = ref<'ALL' | 'AVAILABLE' | 'EMPTY'>('ALL');
const documentKeyword = ref('');
const documentType = ref<'ALL' | DocumentType>('ALL');
const documentStatus = ref<'ALL' | DocumentStatus>('ALL');
const selectedMaterial = ref<MaterialItem | null>(null);
const detailsOpen = computed({ get: () => selectedMaterial.value !== null, set: (open: boolean) => { if (!open) selectedMaterial.value = null; } });
const materialPage = ref(1);
const materialPageSize = ref(10);
const documentPage = ref(1);
const documentPageSize = ref(10);
const createPermissions = requiredBusinessModulePermissions('SUPPLY', 'CREATE');
const canCreate = computed(() => createPermissions.every((code) => session.can(code)));
const supplyDocuments = computed(() => workflow.documents.filter((document) => document.module === 'SUPPLY'));
const metricItems = computed(() => [
  { key: 'catalog', label: '目录项目', value: materials.value.length },
  { key: 'empty', label: '无可用库存', value: materials.value.filter((item) => Number(item.availableQuantity) <= 0).length },
  { key: 'purchases', label: '本人申购单', value: supplyDocuments.value.filter((item) => item.documentType === 'MATERIAL_PURCHASE').length },
  { key: 'requisitions', label: '本人领用单', value: supplyDocuments.value.filter((item) => item.documentType === 'MATERIAL_REQUISITION').length },
]);
const filteredMaterials = computed(() => {
  const keyword = materialKeyword.value.trim().toLocaleLowerCase();
  return materials.value.filter((item) => {
    const matchesKeyword = !keyword || [item.code, item.name, item.specification, item.unit].some((value) => value.toLocaleLowerCase().includes(keyword));
    const quantity = Number(item.availableQuantity);
    return matchesKeyword && (stockFilter.value === 'ALL' || (stockFilter.value === 'AVAILABLE' && quantity > 0) || (stockFilter.value === 'EMPTY' && quantity <= 0));
  });
});
const filteredDocuments = computed(() => {
  const keyword = documentKeyword.value.trim().toLocaleLowerCase();
  return supplyDocuments.value.filter((document) => (!keyword || document.title.toLocaleLowerCase().includes(keyword)) && (documentType.value === 'ALL' || document.documentType === documentType.value) && (documentStatus.value === 'ALL' || document.status === documentStatus.value));
});
const visibleMaterials = computed(() => filteredMaterials.value.slice((materialPage.value - 1) * materialPageSize.value, materialPage.value * materialPageSize.value));
const visibleDocuments = computed(() => filteredDocuments.value.slice((documentPage.value - 1) * documentPageSize.value, documentPage.value * documentPageSize.value));
const materialColumns = [
  { key: 'code', label: '货物编号', width: 150 }, { key: 'name', label: '品名', minWidth: 190 },
  { key: 'specification', label: '规格', minWidth: 200 }, { key: 'unit', label: '单位', width: 90 },
  { key: 'availableQuantity', label: '可用库存', width: 135 }, { key: 'active', label: '状态', width: 110 },
  { key: 'actions', label: '操作', width: 90 },
];
const documentColumns = [
  { key: 'title', label: '单据', minWidth: 240 }, { key: 'documentType', label: '类型', width: 150 },
  { key: 'status', label: '状态', width: 110 }, { key: 'revision', label: '修订', width: 80 },
  { key: 'updatedAt', label: '更新时间', width: 185 }, { key: 'actions', label: '操作', width: 90 },
];
watch([materialKeyword, stockFilter], () => { materialPage.value = 1; });
watch([documentKeyword, documentType, documentStatus], () => { documentPage.value = 1; });
onMounted(() => { void refresh(); });
async function refresh(): Promise<void> {
  loadingMaterials.value = true;
  pageError.value = '';
  try {
    await session.ensureSession();
    const [inventory] = await Promise.all([supplyApi.listItems(), workflow.refresh()]);
    materials.value = inventory;
  } catch (error) { pageError.value = error instanceof Error ? error.message : '物资台账加载失败'; }
  finally { loadingMaterials.value = false; }
}
function openDocument(document: DocumentSummary): void {
  const canEdit = canCreate.value && document.applicantId === session.user?.id && ['DRAFT', 'RETURNED'].includes(document.status);
  if (!canEdit) { void router.push(documentDetailPath(document.documentType, document.id)); return; }
  const name = document.documentType === 'MATERIAL_PURCHASE' ? supplyRouteNames.purchaseEdit : supplyRouteNames.requisitionEdit;
  void router.push({ name, params: { id: document.id } });
}
function resetMaterialFilters(): void { materialKeyword.value = ''; stockFilter.value = 'ALL'; }
function resetDocumentFilters(): void { documentKeyword.value = ''; documentType.value = 'ALL'; documentStatus.value = 'ALL'; }
</script>

<template>
  <div class="ui-page supply-overview">
    <AppPageHeader title="物资申购与领用" eyebrow="物资管理" description="目录库存与申请单据">
      <template #actions><div class="ui-actions"><el-button v-if="canCreate" type="primary" :icon="Plus" @click="router.push({ name: supplyRouteNames.purchaseCreate })">新建申购</el-button><el-button v-if="canCreate" @click="router.push({ name: supplyRouteNames.requisitionCreate })">新建领用</el-button><el-button :icon="Refresh" :loading="loadingMaterials || workflow.loading" aria-label="刷新" title="刷新" @click="refresh" /></div></template>
    </AppPageHeader>
    <el-alert v-if="pageError" :title="pageError" show-icon type="error" :closable="false" />
    <WorkspaceMetricStrip label="物资业务统计" :items="metricItems" />
    <el-tabs v-model="activeTab">
      <el-tab-pane label="物资目录与库存" name="inventory">
        <WorkspaceFilterBar label="物资目录筛选" :result-label="`共 ${filteredMaterials.length} 条`">
          <template #search>
            <el-input v-model="materialKeyword" :prefix-icon="Search" clearable placeholder="搜索编号、品名、规格或单位" aria-label="搜索物资" />
          </template>
          <template #filters>
            <el-select v-model="stockFilter" aria-label="库存状态">
              <el-option label="全部库存" value="ALL" />
              <el-option label="有可用库存" value="AVAILABLE" />
              <el-option label="无可用库存" value="EMPTY" />
            </el-select>
          </template>
          <template #actions>
            <el-button v-if="materialKeyword || stockFilter !== 'ALL'" @click="resetMaterialFilters">清空筛选</el-button>
          </template>
        </WorkspaceFilterBar>
        <UiDataList :rows="visibleMaterials" :columns="materialColumns" :loading="loadingMaterials" empty-text="暂无符合条件的物资" @row-click="selectedMaterial = $event">
          <template #cell-code="{ row }"><span class="table-link">{{ row.code }}</span></template>
          <template #cell-availableQuantity="{ row }"><strong :class="{ 'stock-empty': Number(row.availableQuantity) <= 0 }">{{ row.availableQuantity }} {{ row.unit }}</strong></template>
          <template #cell-active="{ row }"><el-tag :type="row.active ? 'success' : 'info'" effect="plain">{{ row.active ? '启用' : '停用' }}</el-tag></template>
          <template #mobile-title="{ row }"><strong>{{ row.name }}</strong><small class="record-subtitle">{{ row.code }}</small></template>
          <template #mobile-summary="{ row }"><div class="record-summary"><span>{{ row.specification }} · {{ row.unit }}</span><strong :class="{ 'stock-empty': Number(row.availableQuantity) <= 0 }">可用 {{ row.availableQuantity }} {{ row.unit }}</strong></div></template>
          <template #actions="{ row }"><el-button text :aria-label="`查看${row.name}详情`" @click="selectedMaterial = row">查看</el-button></template>
        </UiDataList>
        <UiPagination v-model:page="materialPage" v-model:page-size="materialPageSize" :total="filteredMaterials.length" :page-sizes="[10, 20, 50]" />
      </el-tab-pane>
      <el-tab-pane label="我的物资单据" name="documents">
        <div class="ui-toolbar document-filters">
          <el-input v-model="documentKeyword" :prefix-icon="Search" clearable placeholder="搜索单据标题" aria-label="搜索单据" />
          <el-select v-model="documentType" aria-label="单据类型"><el-option label="全部类型" value="ALL" /><el-option label="物资申购" value="MATERIAL_PURCHASE" /><el-option label="物资领用" value="MATERIAL_REQUISITION" /></el-select>
          <el-select v-model="documentStatus" aria-label="单据状态"><el-option label="全部状态" value="ALL" /><el-option label="草稿" value="DRAFT" /><el-option label="审批中" value="IN_REVIEW" /><el-option label="已退回" value="RETURNED" /><el-option label="已通过" value="APPROVED" /><el-option label="已取消" value="CANCELLED" /></el-select>
          <div v-if="documentKeyword || documentType !== 'ALL' || documentStatus !== 'ALL'" class="ui-toolbar__end">
            <el-button @click="resetDocumentFilters">清空筛选</el-button>
          </div>
        </div>
        <UiDataList :rows="visibleDocuments" :columns="documentColumns" :loading="workflow.loading" empty-text="暂无符合条件的单据" @row-click="openDocument">
          <template #cell-title="{ row }"><span class="table-link">{{ row.title }}</span></template>
          <template #cell-documentType="{ row }">{{ documentTypeMeta[row.documentType as DocumentType].label }}</template>
          <template #cell-status="{ row }"><StatusTag :status="row.status" /></template>
          <template #cell-updatedAt="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
          <template #mobile-title="{ row }"><strong>{{ row.title }}</strong></template>
          <template #mobile-summary="{ row }"><div class="record-summary"><span>{{ documentTypeMeta[row.documentType as DocumentType].label }} · {{ formatDateTime(row.updatedAt) }}</span><StatusTag :status="row.status" /></div></template>
          <template #actions="{ row }"><el-button text :aria-label="`查看${row.title}`" @click="openDocument(row)">查看</el-button></template>
        </UiDataList>
        <UiPagination v-model:page="documentPage" v-model:page-size="documentPageSize" :total="filteredDocuments.length" :page-sizes="[10, 20, 50]" />
      </el-tab-pane>
    </el-tabs>
    <UiDialog v-model="detailsOpen" title="物资目录详情" :width="480">
      <dl v-if="selectedMaterial" class="detail-facts"><div><dt>货物编号</dt><dd>{{ selectedMaterial.code }}</dd></div><div><dt>品名</dt><dd>{{ selectedMaterial.name }}</dd></div><div><dt>规格</dt><dd>{{ selectedMaterial.specification }}</dd></div><div><dt>单位</dt><dd>{{ selectedMaterial.unit }}</dd></div><div><dt>可用库存</dt><dd>{{ selectedMaterial.availableQuantity }} {{ selectedMaterial.unit }}</dd></div><div><dt>目录状态</dt><dd>{{ selectedMaterial.active ? '启用' : '停用' }}</dd></div></dl>
    </UiDialog>
  </div>
</template>

<style scoped>
.supply-overview { min-width: 0; }
.inventory-filters, .document-filters { margin: 16px 0 20px; }
.record-subtitle { display: block; margin-top: 5px; color: var(--color-text-secondary); }
.record-summary { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; align-items: center; color: var(--color-text-secondary); font-size: 13px; }
.stock-empty { color: var(--color-danger); }
.table-link { font-weight: 600; color: var(--color-primary); }
.detail-facts { display: grid; gap: 0; margin: 0; }
.detail-facts div { display: grid; grid-template-columns: minmax(100px, 36%) minmax(0, 1fr); gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--color-border); }
.detail-facts dt { color: var(--color-text-secondary); }
.detail-facts dd { margin: 0; overflow-wrap: anywhere; }
</style>
