<script setup lang="ts">
import { Delete, Edit, Plus, Setting } from '@element-plus/icons-vue';
import type { MenuTreeNode, RoleMenuAssignment } from '@oa/contracts';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import UiDataList from '../../../../ui/UiDataList.vue';
import UiDialog from '../../../../ui/UiDialog.vue';
import { iamApi } from '../../api/iam-api';
import type { Permission, RoleSummary } from '../../types/iam';
import { platformErrorMessage } from '../../utils/error';

const props = defineProps<{ roles: RoleSummary[]; permissions: Permission[]; loading: boolean; readonly: boolean }>();
const emit = defineEmits<{ refresh: [] }>();
const saving = ref(false);
const columns = [
  { key: 'name', label: '角色名称', minWidth: 160 },
  { key: 'code', label: '角色编码', minWidth: 180 },
  { key: 'description', label: '角色说明', minWidth: 180 },
  { key: 'permissionIds', label: '功能权限', width: 110 },
  { key: 'active', label: '状态', width: 90 },
  { key: 'actions', label: '操作', width: 250 },
];
const roleDialogOpen = ref(false);
const editingRoleId = ref<string | null>(null);
const roleForm = reactive({ code: '', name: '', description: '', active: true });

function openRole(role?: RoleSummary): void {
  if (props.readonly) return;
  editingRoleId.value = role?.id ?? null;
  Object.assign(roleForm, { code: role?.code ?? '', name: role?.name ?? '', description: role?.description ?? '', active: role?.active ?? true });
  roleDialogOpen.value = true;
}
async function saveRole(): Promise<void> {
  if (props.readonly) return;
  const code = roleForm.code.trim().toUpperCase();
  const name = roleForm.name.trim();
  if (!name || (!editingRoleId.value && !/^[A-Z][A-Z0-9_]*$/.test(code))) {
    ElMessage.warning('请填写角色名称，编码需使用大写字母、数字和下划线');
    return;
  }
  saving.value = true;
  try {
    if (editingRoleId.value) await iamApi.updateRole(editingRoleId.value, { name, description: roleForm.description.trim() || null, active: roleForm.active });
    else await iamApi.createRole({ code, name, description: roleForm.description.trim() || null });
    roleDialogOpen.value = false;
    emit('refresh');
    ElMessage.success(editingRoleId.value ? '角色信息已更新' : '业务角色已创建');
  } catch (cause) { ElMessage.error(platformErrorMessage(cause, '角色信息保存失败')); }
  finally { saving.value = false; }
}
async function removeRole(role: RoleSummary): Promise<void> {
  if (props.readonly || role.code === 'SYSTEM_ADMIN') return;
  try { await ElMessageBox.confirm(`确定删除角色「${role.name}」吗？权限与菜单授权将一并移除。`, '删除角色', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' }); }
  catch { return; }
  saving.value = true;
  try { await iamApi.deleteRole(role.id); ElMessage.success('角色已删除'); emit('refresh'); }
  catch (cause) { ElMessage.error(platformErrorMessage(cause, '角色删除失败')); }
  finally { saving.value = false; }
}

const permOpen = ref(false);
const permRoleId = ref<string | null>(null);
const permTab = ref<'menus' | 'permissions'>('menus');
const permCheckedKeys = ref<string[]>([]);
const menuTree = ref<MenuTreeNode[]>([]);
const roleMenuAssignments = ref<RoleMenuAssignment[]>([]);
const menuCheckedKeys = ref<string[]>([]);
const permRole = computed(() => props.roles.find((role) => role.id === permRoleId.value) ?? null);
const isSystemAdmin = computed(() => permRole.value?.code === 'SYSTEM_ADMIN');
onMounted(async () => {
  try { [menuTree.value, roleMenuAssignments.value] = await Promise.all([iamApi.menuTree(), iamApi.listRoleMenuAssignments()]); }
  catch (cause) { ElMessage.error(platformErrorMessage(cause, '菜单授权数据加载失败')); }
});
const menuTreeData = computed(() => {
  interface MenuOption { id: string; label: string; disabled: boolean; children: MenuOption[] }
  const map = (nodes: readonly MenuTreeNode[]): MenuOption[] => nodes.map((node) => ({
    id: node.id, label: node.type === 'DIR' ? `${node.name}（目录）` : node.name,
    disabled: props.readonly || isSystemAdmin.value, children: map(node.children),
  }));
  return map(menuTree.value);
});
const allMenuIds = computed(() => {
  const ids: string[] = [];
  const walk = (nodes: readonly MenuTreeNode[]): void => { for (const node of nodes) { ids.push(node.id); walk(node.children); } };
  walk(menuTree.value);
  return ids;
});
const moduleLabels: Record<string, string> = {
  PORTAL: '公司门户', CONTENT: '内容管理', CONTRACT: '合同与支出', PURCHASE: '采购审批',
  PETTY: '零星采买', SEAL: '行政印章', SUPPLY: '物资管理', DOCUMENT: '单据中心',
  WORKFLOW: '审批中心', FINANCE: '财务审核', FORM_DESIGN: '表单设计',
  PROCESS_DESIGN: '流程设计', IAM: '组织与权限',
};
const permissionTreeData = computed(() => {
  const grouped = new Map<string, Permission[]>();
  props.permissions.filter((permission) => permission.active).forEach((permission) =>
    grouped.set(permission.module, [...(grouped.get(permission.module) ?? []), permission]));
  return [...grouped.entries()].map(([module, items]) => ({
    id: `module:${module}`, label: moduleLabels[module] ?? module,
    disabled: props.readonly || isSystemAdmin.value,
    children: items.map((permission) => ({ id: permission.id, label: permission.name, disabled: permissionDisabled(permission.id) })),
  }));
});
const permissionIdSet = computed(() => new Set(props.permissions.map((item) => item.id)));
function leafMenuIds(menuIds: readonly string[]): string[] {
  const leaves: string[] = [];
  const walk = (nodes: readonly MenuTreeNode[]): void => { for (const node of nodes) { if (node.children.length === 0) { if (menuIds.includes(node.id)) leaves.push(node.id); } else walk(node.children); } };
  walk(menuTree.value);
  return leaves;
}
function menuIdsWithAncestors(checked: readonly string[]): string[] {
  const result = new Set<string>();
  const walk = (nodes: readonly MenuTreeNode[], ancestors: string[]): void => {
    for (const node of nodes) { if (checked.includes(node.id)) { result.add(node.id); ancestors.forEach((id) => result.add(id)); } walk(node.children, [...ancestors, node.id]); }
  };
  walk(menuTree.value, []);
  return [...result];
}
function openPermissions(role: RoleSummary): void {
  permRoleId.value = role.id;
  permTab.value = 'menus';
  permCheckedKeys.value = [...role.permissionIds];
  const assignment = roleMenuAssignments.value.find((entry) => entry.roleId === role.id);
  menuCheckedKeys.value = leafMenuIds(role.code === 'SYSTEM_ADMIN' ? allMenuIds.value : (assignment?.menuIds ?? []));
  permOpen.value = true;
}
function permissionDisabled(id: string): boolean {
  return props.readonly || (isSystemAdmin.value && (permRole.value?.permissionIds.includes(id) ?? false));
}
async function savePermissions(): Promise<void> {
  const role = permRole.value;
  if (!role || props.readonly) return;
  saving.value = true;
  try {
    await iamApi.saveRolePermissions(role.id, permCheckedKeys.value.filter((key) => permissionIdSet.value.has(key)));
    if (!isSystemAdmin.value) {
      const updated = await iamApi.saveRoleMenus(role.id, menuIdsWithAncestors(menuCheckedKeys.value));
      roleMenuAssignments.value = [...roleMenuAssignments.value.filter((entry) => entry.roleId !== updated.roleId), updated];
    }
    ElMessage.success('角色权限与菜单授权已保存');
    permOpen.value = false;
    emit('refresh');
  } catch (cause) { ElMessage.error(platformErrorMessage(cause, '角色权限保存失败')); }
  finally { saving.value = false; }
}
</script>

<template>
  <section class="role-permission-panel">
    <div class="ui-toolbar">
      <h2>业务角色</h2>
      <el-button v-if="!readonly" :icon="Plus" type="primary" @click="openRole()">新增角色</el-button>
    </div>
    <UiDataList :rows="roles" :columns="columns" :loading="loading" empty-text="暂无角色">
      <template #cell-permissionIds="{ row }">{{ row.permissionIds.length }} 项</template>
      <template #cell-description="{ row }">{{ row.description || '—' }}</template>
      <template #cell-active="{ row }"><el-tag :type="row.active ? 'success' : 'info'">{{ row.active ? '正常' : '停用' }}</el-tag></template>
      <template #actions="{ row }">
        <el-button :icon="Setting" link @click="openPermissions(row)">权限授权</el-button>
        <template v-if="!readonly">
          <el-button :icon="Edit" link @click="openRole(row)">编辑</el-button>
          <el-button v-if="row.code !== 'SYSTEM_ADMIN'" :icon="Delete" link type="danger" @click="removeRole(row)">删除</el-button>
        </template>
      </template>
    </UiDataList>
  </section>

  <UiDialog v-model="roleDialogOpen" :title="editingRoleId ? '编辑业务角色' : '新增业务角色'" :width="520">
    <el-form label-position="top" class="ui-fields">
      <el-form-item label="角色名称" required>
        <el-input v-model="roleForm.name" maxlength="100" />
      </el-form-item>
      <el-form-item label="角色编码" required>
        <el-input v-model="roleForm.code" :disabled="Boolean(editingRoleId)" maxlength="60" @input="roleForm.code = roleForm.code.toUpperCase()" />
      </el-form-item>
      <el-form-item class="ui-field-full" label="角色说明">
        <el-input v-model="roleForm.description" maxlength="300" :rows="3" type="textarea" />
      </el-form-item>
      <el-form-item v-if="editingRoleId" label="启用状态">
        <el-switch v-model="roleForm.active" :disabled="roleForm.code === 'SYSTEM_ADMIN'" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="roleDialogOpen = false">取消</el-button>
      <el-button :loading="saving" type="primary" @click="saveRole">保存</el-button>
    </template>
  </UiDialog>

  <UiDialog v-model="permOpen" :title="`权限授权：${permRole?.name ?? ''}`" :width="620">
    <el-alert v-if="isSystemAdmin" title="系统管理员始终拥有全部权限与菜单，不可削减" type="info" :closable="false" show-icon />
    <el-tabs v-model="permTab">
      <el-tab-pane label="菜单权限" name="menus">
        <div class="permission-tree">
          <el-tree v-model:checked-keys="menuCheckedKeys" :data="menuTreeData" node-key="id" show-checkbox default-expand-all :props="{ label: 'label', children: 'children', disabled: 'disabled' }" />
        </div>
      </el-tab-pane>
      <el-tab-pane label="功能权限" name="permissions">
        <div class="permission-tree">
          <el-tree v-model:checked-keys="permCheckedKeys" :data="permissionTreeData" node-key="id" show-checkbox default-expand-all :props="{ label: 'label', children: 'children', disabled: 'disabled' }" />
        </div>
      </el-tab-pane>
    </el-tabs>
    <template #footer>
      <el-button @click="permOpen = false">取消</el-button>
      <el-button v-if="!readonly" :loading="saving" type="primary" @click="savePermissions">保存授权</el-button>
    </template>
  </UiDialog>
</template>

<style scoped>
.role-permission-panel {
  min-width: 0;
}
.permission-tree {
  min-width: 0;
  padding: 12px;
  background: var(--color-canvas);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.permission-tree :deep(.el-tree-node__content) {
  min-height: 36px;
  border-radius: var(--radius-sm);
}
html[data-layout='compact'] .permission-tree {
  padding: 8px 4px;
}
</style>
