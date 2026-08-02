<script setup lang="ts">
import { Plus, Refresh } from '@element-plus/icons-vue';
import type { MenuInput, MenuNode, MenuTreeNode } from '@oa/contracts';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { iamApi } from '../api/iam-api';
import PlatformPageHeader from '../components/PlatformPageHeader.vue';

const loading = ref(false);
const menuTree = ref<MenuTreeNode[]>([]);

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
  <div class="platform-page menu-management-page">
    <PlatformPageHeader
      description="维护系统菜单树（目录/菜单、路由、权限标识、排序、显示状态）；角色的菜单授权在「组织与权限 → 角色权限」中配置。"
      eyebrow="平台管理 / 菜单"
      title="菜单管理"
    >
      <template #actions>
        <el-button :icon="Refresh" :loading="loading" @click="refresh">刷新</el-button>
      </template>
    </PlatformPageHeader>

    <el-card shadow="never">
      <template #header>
        <div class="menu-tab-header">
          <span>系统菜单树</span>
          <el-button :icon="Plus" type="primary" @click="openCreate()">新增目录/菜单</el-button>
        </div>
      </template>
      <el-skeleton v-if="loading && menuTree.length === 0" animated :rows="8" />
      <el-table
        v-else
        default-expand-all
        :data="menuTree"
        row-key="id"
        :tree-props="{ children: 'children' }"
      >
        <el-table-column label="菜单名称" min-width="200" prop="name" />
        <el-table-column label="类型" width="90">
          <template #default="{ row }">
            <el-tag :type="row.type === 'DIR' ? 'info' : 'primary'" size="small">
              {{ row.type === 'DIR' ? '目录' : '菜单' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="路由地址" min-width="170" prop="path" />
        <el-table-column label="权限标识" min-width="170" prop="permissionCode" />
        <el-table-column label="图标" prop="icon" width="120" />
        <el-table-column label="排序" prop="orderNum" width="70" />
        <el-table-column label="显示" width="80">
          <template #default="{ row }">
            <el-tag :type="row.visible ? 'success' : 'info'" size="small">
              {{ row.visible ? '显示' : '隐藏' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.active ? 'success' : 'danger'" size="small">
              {{ row.active ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="200">
          <template #default="{ row }">
            <el-button v-if="row.type === 'DIR'" link type="primary" @click="openCreate(row)">
              新增子菜单
            </el-button>
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="removeMenu(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑菜单' : '新增菜单'" width="560px">
      <el-form label-width="96px">
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
          <el-input
            v-model="form.permissionCode"
            placeholder="可选，多个用英文逗号分隔，如：IAM_VIEW"
          />
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
    </el-dialog>
  </div>
</template>

<style scoped>
.menu-tab-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
</style>
