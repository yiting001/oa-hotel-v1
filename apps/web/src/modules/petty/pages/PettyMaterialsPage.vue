<script setup lang="ts">
import { Plus, Refresh, Search, Upload } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { apiRequest } from '../../../shared/api';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import MoneyInput from '../../../shared/components/MoneyInput.vue';
import WorkspaceFilterBar from '../../../shared/components/WorkspaceFilterBar.vue';
import UiDataList, { type DataColumn } from '../../../ui/UiDataList.vue';
import UiDialog from '../../../ui/UiDialog.vue';
import UiPagination from '../../../ui/UiPagination.vue';
import { useLayoutMode } from '../../../ui/useLayoutMode';
import { PETTY_API } from '../petty.config';
import { formatYuan } from '../petty.format';
import type { PettyMaterial, PettyMaterialPayload } from '../petty.types';

const { isCompact } = useLayoutMode();
const loading = ref(false);
const saving = ref(false);
const materials = ref<PettyMaterial[]>([]);
const keyword = ref('');
const editorOpen = ref(false);
const importOpen = ref(false);
const editingId = ref<string | null>(null);
const importText = ref('');
const importFileInput = ref<HTMLInputElement | null>(null);
const page = ref(1);
const pageSize = ref(20);

const form = reactive<{
  name: string;
  brand: string;
  unit: string;
  unitPriceCents: number | null;
  supplierName: string;
  supplierContact: string;
  supplierPhone: string;
  active: boolean;
}>({
  name: '',
  brand: '',
  unit: '',
  unitPriceCents: 0,
  supplierName: '',
  supplierContact: '',
  supplierPhone: '',
  active: true,
});

const columns: DataColumn[] = [
  { key: 'name', label: '物资名称', minWidth: 170 },
  { key: 'brand', label: '品牌', minWidth: 120 },
  { key: 'unit', label: '单位', width: 90 },
  { key: 'unitPrice', label: '单价', width: 132, align: 'right' },
  { key: 'supplierName', label: '供货单位', minWidth: 180 },
  { key: 'supplierContact', label: '联系人', width: 130 },
  { key: 'supplierPhone', label: '联系电话', width: 150 },
  { key: 'active', label: '状态', width: 104 },
  { key: 'actions', label: '操作', width: 150 },
];

const filteredMaterials = computed(() => {
  const normalized = keyword.value.trim().toLocaleLowerCase();
  if (!normalized) return materials.value;
  return materials.value.filter((item) =>
    [item.name, item.brand, item.supplierName].some((field) =>
      field.toLocaleLowerCase().includes(normalized),
    ),
  );
});

const visibleMaterials = computed(() =>
  filteredMaterials.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value),
);

watch(keyword, () => {
  page.value = 1;
});
watch(filteredMaterials, (rows) => {
  page.value = Math.min(page.value, Math.max(1, Math.ceil(rows.length / pageSize.value)));
});

async function refresh(): Promise<void> {
  loading.value = true;
  try {
    materials.value = await apiRequest<PettyMaterial[]>(PETTY_API.materials);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '物资库加载失败');
  } finally {
    loading.value = false;
  }
}

function openCreate(): void {
  editingId.value = null;
  Object.assign(form, {
    name: '',
    brand: '',
    unit: '',
    unitPriceCents: 0,
    supplierName: '',
    supplierContact: '',
    supplierPhone: '',
    active: true,
  });
  editorOpen.value = true;
}

function openEdit(record: PettyMaterial): void {
  editingId.value = record.id;
  Object.assign(form, {
    name: record.name,
    brand: record.brand,
    unit: record.unit,
    unitPriceCents: record.unitPriceCents,
    supplierName: record.supplierName,
    supplierContact: record.supplierContact ?? '',
    supplierPhone: record.supplierPhone ?? '',
    active: record.active,
  });
  editorOpen.value = true;
}

function payload(): PettyMaterialPayload {
  return {
    name: form.name.trim(),
    brand: form.brand.trim(),
    unit: form.unit.trim(),
    unitPriceCents: Math.round(form.unitPriceCents ?? 0),
    supplierName: form.supplierName.trim(),
    supplierContact: form.supplierContact.trim() || null,
    supplierPhone: form.supplierPhone.trim() || null,
    active: form.active,
  };
}

async function save(): Promise<void> {
  if (!form.name.trim() || !form.brand.trim() || !form.supplierName.trim()) {
    ElMessage.warning('物资名称、品牌与供货单位为必填项');
    return;
  }
  saving.value = true;
  try {
    await apiRequest(editingId.value ? PETTY_API.material(editingId.value) : PETTY_API.materials, {
      method: editingId.value ? 'PATCH' : 'POST',
      body: payload(),
    });
    ElMessage.success('物资已保存');
    editorOpen.value = false;
    await refresh();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '物资保存失败');
  } finally {
    saving.value = false;
  }
}

async function deactivate(record: PettyMaterial): Promise<void> {
  try {
    await ElMessageBox.confirm(
      '停用后发起人无法再选择该物资，历史单据不受影响。',
      `停用「${record.name}（${record.brand}）」？`,
      { type: 'warning', confirmButtonText: '停用', cancelButtonText: '取消' },
    );
  } catch {
    return;
  }
  try {
    await apiRequest(PETTY_API.material(record.id), { method: 'DELETE' });
    ElMessage.success('物资已停用');
    await refresh();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '停用失败');
  }
}

function parseImportRows(): PettyMaterialPayload[] {
  return importText.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const cells = line.split(/\t|,/).map((cell) => cell.trim());
      const [name, brand, unit, price, supplierName, supplierContact, supplierPhone] = cells;
      const unitPriceCents = Math.round(Number(price) * 100);
      if (!name || !brand || !supplierName || Number.isNaN(unitPriceCents)) {
        throw new Error(
          `行「${line}」格式不正确，应为：名称,品牌,单位,单价(元),供货单位,联系人,电话`,
        );
      }
      return {
        name,
        brand,
        unit: unit ?? '',
        unitPriceCents,
        supplierName,
        supplierContact: supplierContact || null,
        supplierPhone: supplierPhone || null,
        active: true,
      };
    });
}

async function runImport(): Promise<void> {
  let rows: PettyMaterialPayload[];
  try {
    rows = parseImportRows();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '导入内容解析失败');
    return;
  }
  if (rows.length === 0) {
    ElMessage.warning('请粘贴需要导入的物资数据');
    return;
  }
  saving.value = true;
  try {
    const result = await apiRequest<{ imported: number }>(PETTY_API.materialImport, {
      method: 'POST',
      body: { materials: rows },
    });
    ElMessage.success(`成功导入 ${result.imported} 条物资`);
    importOpen.value = false;
    importText.value = '';
    await refresh();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '批量导入失败');
  } finally {
    saving.value = false;
  }
}

async function readImportFile(file: File): Promise<boolean> {
  importText.value = await file.text();
  return false;
}

async function onImportFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) await readImportFile(file);
  input.value = '';
}

onMounted(() => {
  void refresh();
});
</script>

<template>
  <div class="petty-materials-page ui-page">
    <AppPageHeader
      description="零星采买物资基础数据库，支持批量导入维护"
      eyebrow="业务中心"
      title="零星采买物资库"
    >
      <template #actions>
        <div class="ui-actions">
          <el-button type="primary" @click="openCreate">
            <el-icon><Plus /></el-icon>
            新增物资
          </el-button>
          <el-button @click="importOpen = true">
            <el-icon><Upload /></el-icon>
            批量导入
          </el-button>
          <el-button :icon="Refresh" :loading="loading" aria-label="刷新" title="刷新" @click="refresh" />
        </div>
      </template>
    </AppPageHeader>

    <WorkspaceFilterBar label="物资库筛选" :result-label="`共 ${filteredMaterials.length} 条物资`">
      <template #search>
        <el-input
          v-model="keyword"
          :prefix-icon="Search"
          clearable
          placeholder="按名称、品牌、供货单位搜索"
          aria-label="搜索物资"
        />
      </template>
    </WorkspaceFilterBar>

    <UiDataList
      :columns="columns"
      :loading="loading"
      :rows="visibleMaterials"
      empty-text="暂无符合条件的物资"
    >
      <template #cell-unitPrice="{ row }">{{ formatYuan(row.unitPriceCents) }}</template>
      <template #cell-active="{ row }">
        <el-tag :type="row.active ? 'success' : 'info'">{{ row.active ? '启用' : '已停用' }}</el-tag>
      </template>
      <template #mobile-title="{ row }">
        <strong>{{ row.name }}</strong>
        <span class="ui-text-muted"> · {{ row.brand }}</span>
      </template>
      <template #actions="{ row }">
        <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
        <el-button v-if="row.active" link type="danger" @click="deactivate(row)">停用</el-button>
      </template>
    </UiDataList>

    <UiPagination v-model:page="page" v-model:page-size="pageSize" :total="filteredMaterials.length" />

    <UiDialog v-model="editorOpen" :title="editingId ? '编辑物资' : '新增物资'">
      <el-form class="ui-fields" :class="{ 'is-compact': isCompact }" label-position="top">
        <el-form-item class="ui-field-full" label="物资名称" required>
          <el-input v-model="form.name" :maxlength="200" placeholder="如：大米" />
        </el-form-item>
        <el-form-item label="品牌" required>
          <el-input v-model="form.brand" :maxlength="100" placeholder="如：五常" />
        </el-form-item>
        <el-form-item label="单位">
          <el-input v-model="form.unit" :maxlength="20" placeholder="如：斤、箱" />
        </el-form-item>
        <el-form-item label="单价" required>
          <MoneyInput v-model="form.unitPriceCents" aria-label="物资单价" />
        </el-form-item>
        <el-form-item label="供货单位" required>
          <el-input v-model="form.supplierName" :maxlength="300" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="form.supplierContact" :maxlength="100" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.supplierPhone" :maxlength="50" />
        </el-form-item>
        <el-form-item v-if="editingId" label="状态">
          <el-switch
            :model-value="form.active"
            active-text="启用"
            inactive-text="停用"
            @update:model-value="form.active = Boolean($event)"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editorOpen = false">取消</el-button>
        <el-button :loading="saving" type="primary" @click="save">保存</el-button>
      </template>
    </UiDialog>

    <UiDialog v-model="importOpen" title="批量导入物资" :width="640">
      <div class="petty-materials__import">
        <el-alert
          title="从 Excel 复制数据后直接粘贴，或上传 CSV 文件。每行格式：名称,品牌,单位,单价(元),供货单位,联系人,电话"
          show-icon
          type="info"
          :closable="false"
        />
        <div class="petty-materials__file-entry">
          <input
            ref="importFileInput"
            accept=".csv,.txt,.tsv"
            class="petty-materials__file-input"
            type="file"
            @change="onImportFileChange"
          />
          <el-button @click="importFileInput?.click()">
            <el-icon><Upload /></el-icon>
            选择 CSV 文件
          </el-button>
        </div>
        <el-input
          v-model="importText"
          type="textarea"
          :autosize="{ minRows: 8, maxRows: 16 }"
          aria-label="批量导入内容"
          placeholder="大米&#9;五常&#9;斤&#9;3.50&#9;某某粮油&#9;张三&#9;13800000000"
        />
      </div>
      <template #footer>
        <el-button @click="importOpen = false">取消</el-button>
        <el-button :loading="saving" type="primary" @click="runImport">开始导入</el-button>
      </template>
    </UiDialog>
  </div>
</template>

<style scoped>
.petty-materials-page {
  min-width: 0;
}

.petty-materials__import {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.petty-materials__file-entry {
  display: flex;
  min-width: 0;
}

.petty-materials__file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  opacity: 0;
  overflow: hidden;
  clip-path: inset(50%);
}

.petty-materials-page :deep(.el-textarea) {
  min-width: 0;
}
</style>
