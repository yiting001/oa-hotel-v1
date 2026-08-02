<script setup lang="ts">
import { PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons-vue';
import { message, Modal } from 'ant-design-vue';
import { computed, onMounted, reactive, ref } from 'vue';
import { apiRequest } from '../../../shared/api';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import { PETTY_API } from '../petty.config';
import { formatYuan } from '../petty.format';
import type { PettyMaterial, PettyMaterialPayload } from '../petty.types';

const loading = ref(false);
const saving = ref(false);
const materials = ref<PettyMaterial[]>([]);
const keyword = ref('');
const editorOpen = ref(false);
const importOpen = ref(false);
const editingId = ref<string | null>(null);
const importText = ref('');

const form = reactive({
  name: '',
  brand: '',
  unit: '',
  unitPriceYuan: 0,
  supplierName: '',
  supplierContact: '',
  supplierPhone: '',
  active: true,
});

const columns = [
  { title: '物资名称', dataIndex: 'name' },
  { title: '品牌', dataIndex: 'brand' },
  { title: '单位', dataIndex: 'unit' },
  { title: '单价', key: 'unitPrice' },
  { title: '供货单位', dataIndex: 'supplierName' },
  { title: '联系人', dataIndex: 'supplierContact' },
  { title: '联系电话', dataIndex: 'supplierPhone' },
  { title: '状态', key: 'active' },
  { title: '操作', key: 'actions' },
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

async function refresh(): Promise<void> {
  loading.value = true;
  try {
    materials.value = await apiRequest<PettyMaterial[]>(PETTY_API.materials);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '物资库加载失败');
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
    unitPriceYuan: 0,
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
    unitPriceYuan: record.unitPriceCents / 100,
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
    unitPriceCents: Math.round(form.unitPriceYuan * 100),
    supplierName: form.supplierName.trim(),
    supplierContact: form.supplierContact.trim() || null,
    supplierPhone: form.supplierPhone.trim() || null,
    active: form.active,
  };
}

async function save(): Promise<void> {
  if (!form.name.trim() || !form.brand.trim() || !form.supplierName.trim()) {
    message.warning('物资名称、品牌与供货单位为必填项');
    return;
  }
  saving.value = true;
  try {
    await apiRequest(editingId.value ? PETTY_API.material(editingId.value) : PETTY_API.materials, {
      method: editingId.value ? 'PATCH' : 'POST',
      body: payload(),
    });
    message.success('物资已保存');
    editorOpen.value = false;
    await refresh();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '物资保存失败');
  } finally {
    saving.value = false;
  }
}

function deactivate(record: PettyMaterial): void {
  Modal.confirm({
    title: `停用「${record.name}（${record.brand}）」？`,
    content: '停用后发起人无法再选择该物资，历史单据不受影响。',
    okText: '停用',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await apiRequest(PETTY_API.material(record.id), { method: 'DELETE' });
        message.success('物资已停用');
        await refresh();
      } catch (error) {
        message.error(error instanceof Error ? error.message : '停用失败');
      }
    },
  });
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
    message.error(error instanceof Error ? error.message : '导入内容解析失败');
    return;
  }
  if (rows.length === 0) {
    message.warning('请粘贴需要导入的物资数据');
    return;
  }
  saving.value = true;
  try {
    const result = await apiRequest<{ imported: number }>(PETTY_API.materialImport, {
      method: 'POST',
      body: { materials: rows },
    });
    message.success(`成功导入 ${result.imported} 条物资`);
    importOpen.value = false;
    importText.value = '';
    await refresh();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '批量导入失败');
  } finally {
    saving.value = false;
  }
}

async function readImportFile(file: File): Promise<boolean> {
  importText.value = await file.text();
  return false;
}

onMounted(() => {
  void refresh();
});
</script>

<template>
  <div class="petty-materials-page">
    <AppPageHeader
      description="零星采买物资基础数据库，支持批量导入维护"
      eyebrow="业务中心"
      title="零星采买物资库"
    >
      <template #actions>
        <a-space wrap>
          <a-button type="primary" @click="openCreate">
            <template #icon><PlusOutlined /></template>
            新增物资
          </a-button>
          <a-button @click="importOpen = true">
            <template #icon><UploadOutlined /></template>
            批量导入
          </a-button>
          <a-button @click="refresh">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
        </a-space>
      </template>
    </AppPageHeader>

    <a-input
      v-model:value="keyword"
      allow-clear
      placeholder="按名称、品牌、供货单位搜索"
      style="max-width: 320px; margin-bottom: 16px"
    />

    <a-table
      :columns="columns"
      :data-source="filteredMaterials"
      :loading="loading"
      :pagination="{ pageSize: 20, showTotal: (total: number) => `共 ${total} 条` }"
      row-key="id"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'unitPrice'">
          {{ formatYuan((record as PettyMaterial).unitPriceCents) }}
        </template>
        <template v-else-if="column.key === 'active'">
          <a-tag :color="(record as PettyMaterial).active ? 'success' : 'default'">
            {{ (record as PettyMaterial).active ? '启用' : '已停用' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-button size="small" type="link" @click="openEdit(record as PettyMaterial)">
              编辑
            </a-button>
            <a-button
              v-if="(record as PettyMaterial).active"
              danger
              size="small"
              type="link"
              @click="deactivate(record as PettyMaterial)"
            >
              停用
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="editorOpen"
      :confirm-loading="saving"
      :title="editingId ? '编辑物资' : '新增物资'"
      @ok="save"
    >
      <a-form layout="vertical">
        <a-form-item label="物资名称" required>
          <a-input v-model:value="form.name" :maxlength="200" placeholder="如：大米" />
        </a-form-item>
        <a-form-item label="品牌" required>
          <a-input v-model:value="form.brand" :maxlength="100" placeholder="如：五常" />
        </a-form-item>
        <a-form-item label="单位">
          <a-input v-model:value="form.unit" :maxlength="20" placeholder="如：斤、箱" />
        </a-form-item>
        <a-form-item label="单价（元）" required>
          <a-input-number v-model:value="form.unitPriceYuan" :min="0" :precision="2" />
        </a-form-item>
        <a-form-item label="供货单位" required>
          <a-input v-model:value="form.supplierName" :maxlength="300" />
        </a-form-item>
        <a-form-item label="联系人">
          <a-input v-model:value="form.supplierContact" :maxlength="100" />
        </a-form-item>
        <a-form-item label="联系电话">
          <a-input v-model:value="form.supplierPhone" :maxlength="50" />
        </a-form-item>
        <a-form-item v-if="editingId" label="状态">
          <a-switch
            v-model:checked="form.active"
            checked-children="启用"
            un-checked-children="停用"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="importOpen"
      :confirm-loading="saving"
      title="批量导入物资"
      width="640px"
      @ok="runImport"
    >
      <a-space direction="vertical" style="width: 100%">
        <a-alert
          message="从 Excel 复制数据后直接粘贴，或上传 CSV 文件。每行格式：名称,品牌,单位,单价(元),供货单位,联系人,电话"
          show-icon
          type="info"
        />
        <a-upload
          :before-upload="readImportFile"
          :max-count="1"
          :show-upload-list="false"
          accept=".csv,.txt,.tsv"
        >
          <a-button>
            <template #icon><UploadOutlined /></template>
            选择 CSV 文件
          </a-button>
        </a-upload>
        <a-textarea
          v-model:value="importText"
          :auto-size="{ minRows: 8, maxRows: 16 }"
          placeholder="大米&#9;五常&#9;斤&#9;3.50&#9;某某粮油&#9;张三&#9;13800000000"
        />
      </a-space>
    </a-modal>
  </div>
</template>
