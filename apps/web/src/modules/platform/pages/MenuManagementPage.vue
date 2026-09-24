<script setup lang="ts">
import { Minus, Plus, Refresh } from '@element-plus/icons-vue';
import type { MenuInput, MenuNode, MenuTreeNode } from '@oa/contracts';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import FormSection from '../../../shared/components/FormSection.vue';
import UiDataList, { type DataColumn } from '../../../ui/UiDataList.vue';
import UiDialog from '../../../ui/UiDialog.vue';
import { useLayoutMode } from '../../../ui/useLayoutMode';
import { iamApi } from '../api/iam-api';

const loading = ref(false);
const { isCompact } = useLayoutMode();
const columns: DataColumn[] = [
  { key: 'name', label: '菜单名称', minWidth: 210 },
  { key: 'type', label: '类型', width: 90 },
  { key: 'path', label: '路由地址', minWidth: 170 },
  { key: 'permissionCode', label: '权限标识', minWidth: 180 },
  { key: 'icon', label: '图标', width: 110 },
  { key: 'orderNum', label: '排序', width: 70 },
  { key: 'visible', label: '显示', width: 80 },
  { key: 'active', label: '状态', width: 80 },
  { key: 'actions', label: '操作', width: 230 },
];
const expandedIds = ref<string[]>([]);
const menuTree = ref<MenuTreeNode[]>([]);
const visibleMenus = computed(() => {
  const result: Array<MenuTreeNode & { depth: number }> = [];
  const visit = (nodes: MenuTreeNode[], depth: number): void => {
    for (const node of nodes) {
      result.push({ ...node, depth });
      if (!isCompact.value || expandedIds.value.includes(node.id)) visit(node.children, depth + 1);
    }
  };
  visit(menuTree.value, 0);
  return result;
});
function toggleExpanded(id: string): void {
  expandedIds.value = expandedIds.value.includes(id)
    ? expandedIds.value.filter((item) => item !== id)
    : [...expandedIds.value, id];
}
function isExpanded(id: string): boolean {
  return expandedIds.value.includes(id);
}
function indent(row: MenuTreeNode & { depth: number }): string {
  return isCompact.value ? `${row.depth * 16}px` : `${row.depth * 18}px`;
}

const iconOptions = [
  'Box',
  'Checked',
  'Connection',
  'DataBoard',
  'DocumentCopy',
  'EditPen',
  'Grid',
  'House',
  'Menu',
  'Monitor',
  'OfficeBuilding',
  'Setting',
  'Share',
  'ShoppingCart',
  'Stamp',
  'Suitcase',
  'Tickets',
  'TrendCharts',
] as const;

onMounted(() => void refresh());

async function refresh(): Promise<void> {
  loading.value = true;
  try {
    menuTree.value = await iamApi.menuTree();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '菜单数据加载失败');
  } finally {
    loading.value = false;
  }
}

const directoryOptions = computed(() =>
  menuTree.value
    .filter((node) => node.type === 'DIR')
    .map((node) => ({
      id: node.id,
      name: node.name,
    })),
);

/* ---------- 菜单树 CRUD ---------- */

const dialogVisible = ref(false);
const editingId = ref<string | null>(null);
const saving = ref(false);
const form = reactive<MenuInput>(blankForm());

function blankForm(): MenuInput {
  return {
    parentId: null,
    name: '',
    type: 'MENU',
    path: null,
    permissionCode: null,
    icon: null,
    orderNum: 1,
    visible: true,
    active: true,
  };
}

function openCreate(parent?: MenuTreeNode): void {
  editingId.value = null;
  Object.assign(form, blankForm());
  if (parent) {
    form.parentId = parent.id;
    form.orderNum = parent.children.length + 1;
  } else {
    form.orderNum = menuTree.value.length + 1;
  }
  dialogVisible.value = true;
}

function openEdit(menu: MenuNode): void {
  editingId.value = menu.id;
  Object.assign(form, {
    parentId: menu.parentId,
    name: menu.name,
    type: menu.type,
    path: menu.path,
    permissionCode: menu.permissionCode,
    icon: menu.icon,
    orderNum: menu.orderNum,
    visible: menu.visible,
    active: menu.active,
  });
  dialogVisible.value = true;
}

async function saveMenu(): Promise<void> {
  if (!form.name.trim()) {
    ElMessage.warning('请填写菜单名称');
    return;
  }
  if (form.type === 'MENU' && !form.path?.trim()) {
    ElMessage.warning('菜单类型需要填写路由地址');
    return;
  }
  const payload: MenuInput = {
    ...form,
    name: form.name.trim(),
    path: form.type === 'DIR' ? null : (form.path?.trim() ?? null),
    permissionCode: form.permissionCode?.trim() || null,
    icon: form.icon || null,
  };
  saving.value = true;
  try {
    if (editingId.value) {
      await iamApi.updateMenu(editingId.value, payload);
      ElMessage.success('菜单已更新');
    } else {
      await iamApi.createMenu(payload);
      ElMessage.success('菜单已创建');
    }
    dialogVisible.value = false;
    await refresh();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '菜单保存失败');
  } finally {
    saving.value = false;
  }
}

async function removeMenu(menu: MenuTreeNode): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确认删除菜单「${menu.name}」？删除后角色的对应授权将同步移除。`,
      '删除菜单',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    );
  } catch {
    return;
  }
  try {
    await iamApi.deleteMenu(menu.id);
    ElMessage.success('菜单已删除');
    await refresh();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '菜单删除失败');
  }
}
</script>

<template>
  <div class="menu-management-page ui-page">
    <AppPageHeader
      description="维护系统菜单树（目录/菜单、路由、权限标识、排序、显示状态）；角色的菜单授权在「组织与权限 → 角色权限」中配置。"
      eyebrow="系统设置"
      title="菜单管理"
    >
      <template #actions>
        <el-button :icon="Refresh" :loading="loading" @click="refresh">刷新</el-button>
      </template>
    </AppPageHeader>

    <FormSection title="系统菜单树" description="目录用于分组，菜单项对应具体路由；删除菜单会同步移除角色授权。">
      <div class="menu-toolbar ui-actions">
        <el-button :icon="Plus" type="primary" @click="openCreate()">新增目录/菜单</el-button>
      </div>
      <UiDataList :rows="visibleMenus" :columns="columns" :loading="loading" empty-text="暂无菜单">
        <template #cell-name="{ row }">
          <span class="menu-tree-name" :style="{ paddingLeft: indent(row) }">
            <el-button
              v-if="isCompact && row.children.length"
              circle
              size="small"
              text
              :aria-label="isExpanded(row.id) ? '收起子菜单' : '展开子菜单'"
              @click="toggleExpanded(row.id)"
            >
              <el-icon><Minus v-if="isExpanded(row.id)" /><Plus v-else /></el-icon>
            </el-button>
            <strong>{{ row.name }}</strong>
          </span>
        </template>
        <template #cell-type="{ row }">
          <el-tag :type="row.type === 'DIR' ? 'info' : 'primary'">{{ row.type === 'DIR' ? '目录' : '菜单' }}</el-tag>
        </template>
        <template #cell-visible="{ row }">{{ row.visible ? '显示' : '隐藏' }}</template>
        <template #cell-active="{ row }">
          <el-tag :type="row.active ? 'success' : 'info'">{{ row.active ? '启用' : '停用' }}</el-tag>
        </template>
        <template #actions="{ row }">
          <el-button v-if="row.type === 'DIR'" link @click="openCreate(row)">新增子菜单</el-button>
          <el-button link @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="removeMenu(row)">删除</el-button>
        </template>
      </UiDataList>
    </FormSection>

    <UiDialog v-model="dialogVisible" :title="editingId ? '编辑菜单' : '新增菜单'" :width="560">
      <el-form class="ui-fields menu-form" label-position="top">
        <el-form-item label="菜单类型">
          <el-radio-group v-model="form.type" :disabled="Boolean(editingId)">
            <el-radio-button value="DIR">目录</el-radio-button>
            <el-radio-button value="MENU">菜单</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="上级菜单">
          <el-select v-model="form.parentId" clearable placeholder="顶级（无上级）">
            <el-option
              v-for="dir in directoryOptions"
              :key="dir.id"
              :disabled="dir.id === editingId"
              :label="dir.name"
              :value="dir.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="菜单名称" required>
          <el-input v-model="form.name" maxlength="30" placeholder="如：合同与支出" />
        </el-form-item>
        <el-form-item v-if="form.type === 'MENU'" label="路由地址" required>
          <el-input v-model="form.path" placeholder="如：/contract" />
        </el-form-item>
        <el-form-item label="权限标识">
          <el-input v-model="form.permissionCode" placeholder="可选，多个用英文逗号分隔，如：IAM_VIEW" />
        </el-form-item>
        <el-form-item label="图标">
          <el-select v-model="form.icon" clearable placeholder="可选">
            <el-option v-for="icon in iconOptions" :key="icon" :label="icon" :value="icon" />
          </el-select>
        </el-form-item>
        <el-form-item label="排序号">
          <el-input-number v-model="form.orderNum" :min="1" />
        </el-form-item>
        <el-form-item label="是否显示">
          <el-switch v-model="form.visible" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.active" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button :loading="saving" type="primary" @click="saveMenu">保存</el-button>
      </template>
    </UiDialog>
  </div>
</template>

<style scoped>
.menu-management-page {
  min-width: 0;
}
.menu-toolbar {
  justify-content: flex-end;
  margin-bottom: 16px;
}
.menu-tree-name {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}
.menu-tree-name strong {
  min-width: 0;
  overflow-wrap: anywhere;
}
.menu-form :deep(.el-input-number),
.menu-form :deep(.el-select) {
  width: 100%;
}
</style>
