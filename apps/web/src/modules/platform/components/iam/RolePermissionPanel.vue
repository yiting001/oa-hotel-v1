<script setup lang="ts">
import { Edit, Plus, Search } from '@element-plus/icons-vue';
import type { MenuTreeNode, RoleMenuAssignment } from '@oa/contracts';
import {
  ElButton,
  ElCheckbox,
  ElCheckboxGroup,
  ElDialog,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElMessage,
  ElSwitch,
  ElTag,
  ElTree,
} from 'element-plus';
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { iamApi } from '../../api/iam-api';
import type { Permission, RoleSummary } from '../../types/iam';
import { platformErrorMessage } from '../../utils/error';

const props = defineProps<{
  roles: RoleSummary[];
  permissions: Permission[];
  loading: boolean;
  readonly: boolean;
}>();
const emit = defineEmits<{ refresh: [] }>();

const selectedRoleId = ref<string | null>(null);
const selectedPermissionIds = ref<string[]>([]);
const keyword = ref('');
const saving = ref(false);
const roleDialogOpen = ref(false);
const editingRoleId = ref<string | null>(null);
const roleForm = reactive({ code: '', name: '', description: '', active: true });
const selectedRole = computed(
  () => props.roles.find((role) => role.id === selectedRoleId.value) ?? null,
);
const isSystemAdmin = computed(() => selectedRole.value?.code === 'SYSTEM_ADMIN');

/* ---------- 菜单授权（与功能权限一起保存） ---------- */

type MenuTreeRef = InstanceType<typeof ElTree>;
const menuTree = ref<MenuTreeNode[]>([]);
const roleMenuAssignments = ref<RoleMenuAssignment[]>([]);
const menuTreeRef = ref<MenuTreeRef>();

onMounted(async () => {
  try {
    [menuTree.value, roleMenuAssignments.value] = await Promise.all([
      iamApi.menuTree(),
      iamApi.listRoleMenuAssignments(),
    ]);
    syncMenuTreeChecks();
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '菜单授权数据加载失败'));
  }
});

const allMenuIds = computed(() => {
  const ids: string[] = [];
  const walk = (nodes: readonly MenuTreeNode[]): void => {
    for (const node of nodes) {
      ids.push(node.id);
      walk(node.children);
    }
  };
  walk(menuTree.value);
  return ids;
});

function syncMenuTreeChecks(): void {
  void nextTick(() => {
    const tree = menuTreeRef.value;
    if (!tree) return;
    const assignment = roleMenuAssignments.value.find(
      (entry) => entry.roleId === selectedRoleId.value,
    );
    const menuIds = isSystemAdmin.value ? allMenuIds.value : (assignment?.menuIds ?? []);
    // 只回显叶子勾选，目录由子节点联动为全选/半选
    const leafIds = new Set<string>();
    const walk = (nodes: readonly MenuTreeNode[]): void => {
      for (const node of nodes) {
        if (node.children.length === 0) {
          if (menuIds.includes(node.id)) leafIds.add(node.id);
        } else {
          walk(node.children);
        }
      }
    };
    walk(menuTree.value);
    tree.setCheckedKeys([...leafIds]);
  });
}
const permissionGroups = computed(() => {
  const query = keyword.value.trim().toLowerCase();
  const grouped = new Map<string, Permission[]>();
  props.permissions
    .filter((permission) => permission.active)
    .filter(
      (permission) =>
        !query || `${permission.name} ${permission.code}`.toLowerCase().includes(query),
    )
    .forEach((permission) =>
      grouped.set(permission.module, [...(grouped.get(permission.module) ?? []), permission]),
    );
  return [...grouped.entries()].map(([module, items]) => ({ module, items }));
});

watch(
  () => props.roles,
  (roles) => {
    if (!roles.some((role) => role.id === selectedRoleId.value)) {
      selectedRoleId.value = roles[0]?.id ?? null;
    }
    hydratePermissions();
  },
  { immediate: true },
);
watch(selectedRoleId, () => {
  hydratePermissions();
  syncMenuTreeChecks();
});

function hydratePermissions(): void {
  selectedPermissionIds.value = [...(selectedRole.value?.permissionIds ?? [])];
}

function openRole(role?: RoleSummary): void {
  if (props.readonly) return;
  editingRoleId.value = role?.id ?? null;
  Object.assign(roleForm, {
    code: role?.code ?? '',
    name: role?.name ?? '',
    description: role?.description ?? '',
    active: role?.active ?? true,
  });
  roleDialogOpen.value = true;
}

function toggleModule(items: Permission[]): void {
  if (props.readonly) return;
  const ids = items.map((item) => item.id);
  const protectedRole = selectedRole.value?.code === 'SYSTEM_ADMIN';
  const allSelected = ids.every((id) => selectedPermissionIds.value.includes(id));
  selectedPermissionIds.value =
    allSelected && !protectedRole
      ? selectedPermissionIds.value.filter((id) => !ids.includes(id))
      : [...new Set([...selectedPermissionIds.value, ...ids])];
}

function permissionDisabled(permissionId: string): boolean {
  return (
    props.readonly ||
    (selectedRole.value?.code === 'SYSTEM_ADMIN' &&
      selectedRole.value.permissionIds.includes(permissionId))
  );
}

async function savePermissions(): Promise<void> {
  if (!selectedRole.value || props.readonly) return;
  saving.value = true;
  try {
    await iamApi.saveRolePermissions(selectedRole.value.id, selectedPermissionIds.value);
    const tree = menuTreeRef.value;
    if (tree && !isSystemAdmin.value) {
      const menuIds = [
        ...(tree.getCheckedKeys() as string[]),
        ...(tree.getHalfCheckedKeys() as string[]),
      ];
      const updated = await iamApi.saveRoleMenus(selectedRole.value.id, menuIds);
      roleMenuAssignments.value = roleMenuAssignments.value.map((entry) =>
        entry.roleId === updated.roleId ? updated : entry,
      );
    }
    ElMessage.success('角色权限与菜单授权已保存');
    emit('refresh');
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '角色权限保存失败'));
  } finally {
    saving.value = false;
  }
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
    const saved = editingRoleId.value
      ? await iamApi.updateRole(editingRoleId.value, {
          name,
          description: roleForm.description.trim() || null,
          active: roleForm.active,
        })
      : await iamApi.createRole({
          code,
          name,
          description: roleForm.description.trim() || null,
        });
    selectedRoleId.value = saved.id;
    roleDialogOpen.value = false;
    emit('refresh');
    ElMessage.success(editingRoleId.value ? '角色信息已更新' : '业务角色已创建');
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '角色信息保存失败'));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div v-loading="loading" class="iam-role-layout">
    <aside class="iam-role-list">
      <div class="platform-panel-heading">
        <div>
          <strong>业务角色</strong><small>{{ roles.length }} 个角色</small>
        </div>
        <ElButton v-if="!readonly" circle size="small" title="新建角色" @click="openRole()">
          <ElIcon><Plus /></ElIcon>
        </ElButton>
      </div>
      <button
        v-for="role in roles"
        :key="role.id"
        :class="{ 'is-active': role.id === selectedRoleId }"
        type="button"
        @click="selectedRoleId = role.id"
      >
        <span
          ><strong>{{ role.name }}</strong
          ><small>{{ role.code }}</small></span
        >
        <ElTag :type="role.active ? 'success' : 'info'" effect="plain" size="small">
          {{ role.active ? '正常' : '停用' }}
        </ElTag>
      </button>
    </aside>

    <section v-if="selectedRole" class="iam-permission-editor">
      <div class="platform-panel-heading">
        <div>
          <strong>{{ selectedRole.name }} 权限</strong>
          <small>{{ selectedRole.description || '按业务模块勾选最小必要权限' }}</small>
        </div>
        <div class="platform-inline-actions">
          <ElButton v-if="!readonly" @click="openRole(selectedRole)">
            <ElIcon><Edit /></ElIcon>编辑角色
          </ElButton>
          <ElButton v-if="!readonly" :loading="saving" type="primary" @click="savePermissions">
            保存授权
          </ElButton>
        </div>
      </div>
      <ElInput v-model="keyword" clearable placeholder="搜索权限名称或编码">
        <template #prefix
          ><ElIcon><Search /></ElIcon
        ></template>
      </ElInput>
      <ElCheckboxGroup v-model="selectedPermissionIds" class="permission-groups">
        <section v-for="group in permissionGroups" :key="group.module" class="permission-group">
          <header>
            <div>
              <strong>{{ group.module }}</strong
              ><small>{{ group.items.length }} 项权限</small>
            </div>
            <ElButton v-if="!readonly" link type="primary" @click="toggleModule(group.items)">
              全选 / 清空
            </ElButton>
          </header>
          <div class="permission-group__items">
            <ElCheckbox
              v-for="permission in group.items"
              :key="permission.id"
              :disabled="permissionDisabled(permission.id)"
              :value="permission.id"
            >
              <span
                ><strong>{{ permission.name }}</strong
                ><small>{{ permission.code }}</small></span
              >
            </ElCheckbox>
          </div>
        </section>
      </ElCheckboxGroup>
      <section class="role-menu-section">
        <header class="role-menu-section__header">
          <div>
            <strong>菜单权限</strong>
            <small>勾选该角色可见的导航菜单；用户拥有多个角色时菜单取并集</small>
          </div>
          <ElTag v-if="isSystemAdmin" size="small" type="info">系统管理员始终拥有全部菜单</ElTag>
        </header>
        <ElTree
          ref="menuTreeRef"
          :data="menuTree"
          default-expand-all
          node-key="id"
          :props="{
            label: 'name',
            children: 'children',
            disabled: () => readonly || isSystemAdmin,
          }"
          show-checkbox
        >
          <template #default="{ data }">
            <span class="role-menu-node">
              {{ data.name }}
              <ElTag v-if="data.type === 'DIR'" size="small" type="info">目录</ElTag>
            </span>
          </template>
        </ElTree>
      </section>
    </section>
  </div>

  <ElDialog
    v-model="roleDialogOpen"
    :title="editingRoleId ? '编辑业务角色' : '新建业务角色'"
    width="520px"
  >
    <ElForm label-position="top">
      <ElFormItem label="角色名称">
        <ElInput v-model="roleForm.name" maxlength="100" placeholder="例如：区域财务审核人" />
      </ElFormItem>
      <ElFormItem label="角色编码">
        <ElInput
          v-model="roleForm.code"
          :disabled="Boolean(editingRoleId)"
          maxlength="60"
          placeholder="REGIONAL_FINANCE_REVIEWER"
          @input="roleForm.code = roleForm.code.toUpperCase()"
        />
        <small class="platform-muted">编码用于流程规则匹配，创建后不可修改</small>
      </ElFormItem>
      <ElFormItem label="角色说明">
        <ElInput v-model="roleForm.description" maxlength="300" :rows="3" type="textarea" />
      </ElFormItem>
      <ElFormItem v-if="editingRoleId" label="启用状态">
        <ElSwitch
          v-model="roleForm.active"
          active-text="启用"
          :disabled="roleForm.code === 'SYSTEM_ADMIN'"
          inactive-text="停用"
        />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="roleDialogOpen = false">取消</ElButton>
      <ElButton :loading="saving" type="primary" @click="saveRole">保存</ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.role-menu-section {
  margin-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 12px;
}

.role-menu-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.role-menu-section__header small {
  display: block;
  color: var(--el-text-color-secondary);
}

.role-menu-node {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>
