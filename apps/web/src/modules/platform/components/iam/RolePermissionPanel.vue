<script setup lang="ts">
import { DeleteOutlined, EditOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons-vue';
import type { MenuTreeNode, RoleMenuAssignment } from '@oa/contracts';
import { message } from 'ant-design-vue';
import { computed, onMounted, reactive, ref } from 'vue';
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

const saving = ref(false);

/* ---------- 角色列表 ---------- */

const columns = [
  { title: '角色名称', key: 'name', width: 170 },
  { title: '角色编码', dataIndex: 'code', width: 220 },
  { title: '角色说明', key: 'description' },
  { title: '功能权限', key: 'permissionCount', width: 100, align: 'center' as const },
  { title: '状态', key: 'status', width: 90, align: 'center' as const },
  ...(props.readonly ? [] : [{ title: '操作', key: 'actions', width: 250 }]),
];

/* ---------- 角色新增 / 编辑 ---------- */

const roleDialogOpen = ref(false);
const editingRoleId = ref<string | null>(null);
const roleForm = reactive({ code: '', name: '', description: '', active: true });

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

async function saveRole(): Promise<void> {
  if (props.readonly) return;
  const code = roleForm.code.trim().toUpperCase();
  const name = roleForm.name.trim();
  if (!name || (!editingRoleId.value && !/^[A-Z][A-Z0-9_]*$/.test(code))) {
    message.warning('请填写角色名称，编码需使用大写字母、数字和下划线');
    return;
  }
  saving.value = true;
  try {
    if (editingRoleId.value) {
      await iamApi.updateRole(editingRoleId.value, {
        name,
        description: roleForm.description.trim() || null,
        active: roleForm.active,
      });
    } else {
      await iamApi.createRole({ code, name, description: roleForm.description.trim() || null });
    }
    roleDialogOpen.value = false;
    emit('refresh');
    message.success(editingRoleId.value ? '角色信息已更新' : '业务角色已创建');
  } catch (cause) {
    message.error(platformErrorMessage(cause, '角色信息保存失败'));
  } finally {
    saving.value = false;
  }
}

async function removeRole(role: RoleSummary): Promise<void> {
  if (props.readonly || role.code === 'SYSTEM_ADMIN') return;
  saving.value = true;
  try {
    await iamApi.deleteRole(role.id);
    message.success('角色已删除');
    emit('refresh');
  } catch (cause) {
    message.error(platformErrorMessage(cause, '角色删除失败'));
  } finally {
    saving.value = false;
  }
}

/* ---------- 权限与菜单授权（弹窗） ---------- */

const permOpen = ref(false);
const permRoleId = ref<string | null>(null);
const permKeyword = ref('');
const selectedPermissionIds = ref<string[]>([]);
const menuTree = ref<MenuTreeNode[]>([]);
const roleMenuAssignments = ref<RoleMenuAssignment[]>([]);
const menuCheckedKeys = ref<string[]>([]);

const permRole = computed(() => props.roles.find((role) => role.id === permRoleId.value) ?? null);
const isSystemAdmin = computed(() => permRole.value?.code === 'SYSTEM_ADMIN');

onMounted(async () => {
  try {
    [menuTree.value, roleMenuAssignments.value] = await Promise.all([
      iamApi.menuTree(),
      iamApi.listRoleMenuAssignments(),
    ]);
  } catch (cause) {
    message.error(platformErrorMessage(cause, '菜单授权数据加载失败'));
  }
});

const menuTreeData = computed(() => {
  const map = (nodes: readonly MenuTreeNode[]): Array<Record<string, unknown>> =>
    nodes.map((node) => ({
      key: node.id,
      title: node.type === 'DIR' ? `${node.name}（目录）` : node.name,
      disabled: props.readonly || isSystemAdmin.value,
      children: map(node.children),
    }));
  return map(menuTree.value);
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

const permissionGroups = computed(() => {
  const query = permKeyword.value.trim().toLowerCase();
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

function leafMenuIds(menuIds: readonly string[]): string[] {
  const leaves: string[] = [];
  const walk = (nodes: readonly MenuTreeNode[]): void => {
    for (const node of nodes) {
      if (node.children.length === 0) {
        if (menuIds.includes(node.id)) leaves.push(node.id);
      } else {
        walk(node.children);
      }
    }
  };
  walk(menuTree.value);
  return leaves;
}

function menuIdsWithAncestors(checked: readonly string[]): string[] {
  const result = new Set<string>();
  const walk = (nodes: readonly MenuTreeNode[], ancestors: string[]): void => {
    for (const node of nodes) {
      if (checked.includes(node.id)) {
        result.add(node.id);
        ancestors.forEach((id) => result.add(id));
      }
      walk(node.children, [...ancestors, node.id]);
    }
  };
  walk(menuTree.value, []);
  return [...result];
}

function openPermissions(role: RoleSummary): void {
  permRoleId.value = role.id;
  permKeyword.value = '';
  selectedPermissionIds.value = [...role.permissionIds];
  const assignment = roleMenuAssignments.value.find((entry) => entry.roleId === role.id);
  const menuIds = role.code === 'SYSTEM_ADMIN' ? allMenuIds.value : (assignment?.menuIds ?? []);
  menuCheckedKeys.value = leafMenuIds(menuIds);
  permOpen.value = true;
}

function toggleModule(items: Permission[]): void {
  if (props.readonly) return;
  const ids = items.map((item) => item.id);
  const allSelected = ids.every((id) => selectedPermissionIds.value.includes(id));
  selectedPermissionIds.value =
    allSelected && !isSystemAdmin.value
      ? selectedPermissionIds.value.filter((id) => !ids.includes(id))
      : [...new Set([...selectedPermissionIds.value, ...ids])];
}

function permissionDisabled(permissionId: string): boolean {
  return (
    props.readonly ||
    (isSystemAdmin.value && (permRole.value?.permissionIds.includes(permissionId) ?? false))
  );
}

async function savePermissions(): Promise<void> {
  const role = permRole.value;
  if (!role || props.readonly) return;
  saving.value = true;
  try {
    await iamApi.saveRolePermissions(role.id, selectedPermissionIds.value);
    if (!isSystemAdmin.value) {
      const updated = await iamApi.saveRoleMenus(
        role.id,
        menuIdsWithAncestors(menuCheckedKeys.value),
      );
      const exists = roleMenuAssignments.value.some((entry) => entry.roleId === updated.roleId);
      roleMenuAssignments.value = exists
        ? roleMenuAssignments.value.map((entry) =>
            entry.roleId === updated.roleId ? updated : entry,
          )
        : [...roleMenuAssignments.value, updated];
    }
    message.success('角色权限与菜单授权已保存');
    permOpen.value = false;
    emit('refresh');
  } catch (cause) {
    message.error(platformErrorMessage(cause, '角色权限保存失败'));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="iam-role-panel">
    <a-card size="small" style="margin-bottom: 16px">
      <a-space wrap>
        <a-button v-if="!readonly" type="primary" ghost @click="openRole()">
          <template #icon><PlusOutlined /></template>
          新增角色
        </a-button>
        <span class="iam-role-panel__hint"
          >角色决定功能权限与可见菜单；用户拥有多个角色时权限取并集</span
        >
      </a-space>
    </a-card>

    <a-table
      :columns="columns"
      :data-source="roles"
      :loading="loading"
      :pagination="{ pageSize: 20, showTotal: (total: number) => `共 ${total} 个角色` }"
      row-key="id"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <strong>{{ (record as RoleSummary).name }}</strong>
        </template>
        <template v-else-if="column.key === 'description'">
          {{ (record as RoleSummary).description || '-' }}
        </template>
        <template v-else-if="column.key === 'permissionCount'">
          {{ (record as RoleSummary).permissionIds.length }} 项
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="(record as RoleSummary).active ? 'green' : 'default'">
            {{ (record as RoleSummary).active ? '正常' : '停用' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-space size="small">
            <a-button size="small" type="link" @click="openPermissions(record as RoleSummary)">
              <template #icon><SettingOutlined /></template>
              权限授权
            </a-button>
            <a-button size="small" type="link" @click="openRole(record as RoleSummary)">
              <template #icon><EditOutlined /></template>
              编辑
            </a-button>
            <a-popconfirm
              v-if="(record as RoleSummary).code !== 'SYSTEM_ADMIN'"
              title="确定删除该角色吗？权限与菜单授权将一并移除。"
              @confirm="removeRole(record as RoleSummary)"
            >
              <a-button danger size="small" type="link">
                <template #icon><DeleteOutlined /></template>
                删除
              </a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="roleDialogOpen"
      :confirm-loading="saving"
      :title="editingRoleId ? '编辑业务角色' : '新增业务角色'"
      width="520px"
      @ok="saveRole"
    >
      <a-form layout="vertical">
        <a-form-item label="角色名称" required>
          <a-input
            v-model:value="roleForm.name"
            :maxlength="100"
            placeholder="例如：区域财务审核人"
          />
        </a-form-item>
        <a-form-item extra="编码用于流程规则匹配，创建后不可修改" label="角色编码" required>
          <a-input
            v-model:value="roleForm.code"
            :disabled="Boolean(editingRoleId)"
            :maxlength="60"
            placeholder="REGIONAL_FINANCE_REVIEWER"
            @input="roleForm.code = roleForm.code.toUpperCase()"
          />
        </a-form-item>
        <a-form-item label="角色说明">
          <a-textarea v-model:value="roleForm.description" :maxlength="300" :rows="3" />
        </a-form-item>
        <a-form-item v-if="editingRoleId" label="启用状态">
          <a-switch
            v-model:checked="roleForm.active"
            checked-children="启用"
            :disabled="roleForm.code === 'SYSTEM_ADMIN'"
            un-checked-children="停用"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="permOpen"
      :confirm-loading="saving"
      :title="`权限授权：${permRole?.name ?? ''}（${permRole?.code ?? ''}）`"
      width="880px"
      @ok="savePermissions"
    >
      <a-alert
        v-if="isSystemAdmin"
        message="系统管理员角色始终拥有全部权限与菜单，不可削减"
        show-icon
        style="margin-bottom: 12px"
        type="info"
      />
      <a-input
        v-model:value="permKeyword"
        allow-clear
        placeholder="搜索权限名称或编码"
        style="margin-bottom: 12px; width: 280px"
      />
      <a-checkbox-group v-model:value="selectedPermissionIds" style="width: 100%">
        <div v-for="group in permissionGroups" :key="group.module" class="perm-group">
          <div class="perm-group__header">
            <strong>{{ group.module }}</strong>
            <span class="perm-group__count">{{ group.items.length }} 项权限</span>
            <a-button v-if="!readonly" size="small" type="link" @click="toggleModule(group.items)">
              全选 / 清空
            </a-button>
          </div>
          <div class="perm-group__items">
            <a-checkbox
              v-for="permission in group.items"
              :key="permission.id"
              :disabled="permissionDisabled(permission.id)"
              :value="permission.id"
            >
              {{ permission.name }}
              <span class="perm-group__code">{{ permission.code }}</span>
            </a-checkbox>
          </div>
        </div>
      </a-checkbox-group>

      <div class="perm-group">
        <div class="perm-group__header">
          <strong>菜单权限</strong>
          <span class="perm-group__count">勾选该角色可见的导航菜单，多个角色取并集</span>
        </div>
        <a-tree
          v-model:checked-keys="menuCheckedKeys"
          checkable
          default-expand-all
          :selectable="false"
          :tree-data="menuTreeData"
        />
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.iam-role-panel__hint {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.perm-group {
  margin-bottom: 16px;
}

.perm-group__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.perm-group__count {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.perm-group__items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 6px 12px;
}

.perm-group__code {
  margin-left: 4px;
  color: rgba(0, 0, 0, 0.4);
  font-size: 12px;
}
</style>
