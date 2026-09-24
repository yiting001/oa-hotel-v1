<script setup lang="ts">
import { Delete, Edit, Key, Plus, Refresh, Search, Setting } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, reactive, ref } from 'vue';
import UiDataList, { type DataColumn } from '../../../../ui/UiDataList.vue';
import UiDialog from '../../../../ui/UiDialog.vue';
import UiPagination from '../../../../ui/UiPagination.vue';
import { randomId } from '../../../../shared/random-id';
import { iamApi } from '../../api/iam-api';
import type {
  DataScope,
  DepartmentNode,
  IamUser,
  Position,
  RoleSummary,
  UserAssignmentsInput,
} from '../../types/iam';
import { platformErrorMessage } from '../../utils/error';
import { flattenDepartments } from '../../utils/iam';

interface MembershipDraft {
  key: string;
  departmentId: string;
  positionId: string | null;
  isPrimary: boolean;
  isDepartmentHead: boolean;
  active: boolean;
}
interface RoleDraft {
  key: string;
  roleId: string;
  dataScope: DataScope;
  scopeDepartmentId: string | null;
}
const props = defineProps<{
  departments: DepartmentNode[];
  positions: Position[];
  roles: RoleSummary[];
  users: IamUser[];
  loading: boolean;
  readonly: boolean;
}>();
const emit = defineEmits<{ refresh: [] }>();
const filters = reactive({ keyword: '', status: undefined as 'active' | 'inactive' | undefined });
const appliedFilters = reactive({ ...filters });
const saving = ref(false);
const page = ref(1);
const pageSize = ref(20);
const assignOpen = ref(false);
const assignUserId = ref<string | null>(null);
const memberships = ref<MembershipDraft[]>([]);
const roleAssignments = ref<RoleDraft[]>([]);
const createOpen = ref(false);
const createForm = reactive({
  username: '',
  displayName: '',
  password: '',
  departmentId: '' as string,
  positionId: '' as string,
  roleIds: [] as string[],
});
const profileOpen = ref(false);
const profileUserId = ref<string | null>(null);
const profileForm = reactive({ displayName: '', active: true });
const passwordOpen = ref(false);
const passwordUserId = ref<string | null>(null);
const passwordForm = reactive({ password: '', confirm: '' });
const departments = computed(() => flattenDepartments(props.departments));
const departmentNames = computed(() => new Map(departments.value.map((item) => [item.id, item.name])));
const positionNames = computed(() => new Map(props.positions.map((item) => [item.id, item.name])));
const roleNames = computed(() => new Map(props.roles.map((item) => [item.id, item.name])));
const activeRoleOptions = computed(() => props.roles.filter((item) => item.active));
const assignUser = computed(() => props.users.find((user) => user.id === assignUserId.value) ?? null);
const profileUser = computed(() => props.users.find((user) => user.id === profileUserId.value) ?? null);
const filteredUsers = computed(() => {
  const query = appliedFilters.keyword.trim().toLowerCase();
  return props.users.filter((user) => {
    if (appliedFilters.status === 'active' && !user.active) return false;
    if (appliedFilters.status === 'inactive' && user.active) return false;
    return !query || `${user.displayName} ${user.username}`.toLowerCase().includes(query);
  });
});
const pagedUsers = computed(() =>
  filteredUsers.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value),
);
const columns: DataColumn[] = [
  { key: 'displayName', label: '姓名', minWidth: 120 },
  { key: 'username', label: '登录账号', minWidth: 140 },
  { key: 'department', label: '主部门', minWidth: 140 },
  { key: 'positions', label: '岗位', minWidth: 140 },
  { key: 'roles', label: '角色', minWidth: 160 },
  { key: 'active', label: '状态', width: 90 },
  { key: 'actions', label: '操作', width: 330 },
];
const dataScopeOptions: Array<{ value: DataScope; label: string }> = [
  { value: 'SELF', label: '仅本人' },
  { value: 'DEPARTMENT', label: '指定部门' },
  { value: 'DEPARTMENT_TREE', label: '指定部门及下级' },
  { value: 'ALL', label: '全部数据' },
];
function search(): void {
  Object.assign(appliedFilters, filters);
  page.value = 1;
}
function resetFilters(): void {
  Object.assign(filters, { keyword: '', status: undefined });
  search();
}
function primaryDepartmentName(user: IamUser): string {
  const primary = user.memberships.find((item) => item.isPrimary) ?? user.memberships[0];
  return primary ? (departmentNames.value.get(primary.departmentId) ?? '—') : '—';
}
function userPositionNames(user: IamUser): string[] {
  return [
    ...new Set(
      user.memberships
        .map((item) => (item.positionId ? positionNames.value.get(item.positionId) : null))
        .filter((name): name is string => Boolean(name)),
    ),
  ];
}
function userRoleNames(user: IamUser): string[] {
  return user.roles
    .map((item) => roleNames.value.get(item.roleId))
    .filter((name): name is string => Boolean(name));
}
function openAssign(user: IamUser): void {
  if (props.readonly) return;
  assignUserId.value = user.id;
  memberships.value = user.memberships.map((item) => ({
    key: item.id || randomId(),
    departmentId: item.departmentId,
    positionId: item.positionId,
    isPrimary: item.isPrimary,
    isDepartmentHead: item.isDepartmentHead,
    active: item.active,
  }));
  roleAssignments.value = user.roles.map((item) => ({
    key: item.assignmentId || randomId(),
    roleId: item.roleId,
    dataScope: item.dataScope,
    scopeDepartmentId: item.scopeDepartmentId,
  }));
  assignOpen.value = true;
}
function addMembership(): void {
  memberships.value.push({
    key: randomId(),
    departmentId: '',
    positionId: null,
    isPrimary: memberships.value.length === 0,
    isDepartmentHead: false,
    active: true,
  });
}
function addRole(): void {
  roleAssignments.value.push({
    key: randomId(),
    roleId: '',
    dataScope: 'SELF',
    scopeDepartmentId: null,
  });
}
function setPrimary(target: MembershipDraft): void {
  if (target.isPrimary)
    memberships.value.forEach((item) => {
      if (item.key !== target.key) item.isPrimary = false;
    });
}
function positionOptionsFor(departmentId: string): Position[] {
  return props.positions.filter(
    (item) => item.active && (item.departmentId === departmentId || item.departmentId === null),
  );
}
function normalizeScope(item: RoleDraft): void {
  if (item.dataScope === 'SELF' || item.dataScope === 'ALL') item.scopeDepartmentId = null;
}
function validate(): string | null {
  if (!memberships.value.length) return '用户至少需要一个部门任职';
  if (memberships.value.some((item) => !item.departmentId)) return '任职部门不能为空';
  if (new Set(memberships.value.map((item) => item.departmentId)).size !== memberships.value.length)
    return '同一用户不能重复加入同一部门';
  if (!memberships.value.some((item) => item.isPrimary)) return '请设置一个主部门';
  if (roleAssignments.value.some((item) => !item.roleId)) return '授权角色不能为空';
  if (new Set(roleAssignments.value.map((item) => item.roleId)).size !== roleAssignments.value.length)
    return '同一角色不能重复授权';
  if (
    roleAssignments.value.some(
      (item) =>
        ['DEPARTMENT', 'DEPARTMENT_TREE'].includes(item.dataScope) && !item.scopeDepartmentId,
    )
  )
    return '部门或部门树数据范围必须明确选择范围部门';
  return null;
}
async function saveAssignments(): Promise<void> {
  if (props.readonly || !assignUserId.value) return;
  const error = validate();
  if (error) {
    ElMessage.warning(error);
    return;
  }
  const input: UserAssignmentsInput = {
    memberships: memberships.value.map(
      ({ departmentId, positionId, isPrimary, isDepartmentHead, active }) => ({
        departmentId,
        positionId,
        isPrimary,
        isDepartmentHead,
        active,
      }),
    ),
    roles: roleAssignments.value.map(({ roleId, dataScope, scopeDepartmentId }) => ({
      roleId,
      dataScope,
      scopeDepartmentId,
    })),
  };
  saving.value = true;
  try {
    await iamApi.saveUserAssignments(assignUserId.value, input);
    ElMessage.success('用户任职与角色授权已保存');
    assignOpen.value = false;
    emit('refresh');
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '用户授权保存失败'));
  } finally {
    saving.value = false;
  }
}
function openCreate(): void {
  if (props.readonly) return;
  Object.assign(createForm, {
    username: '',
    displayName: '',
    password: '',
    departmentId: '',
    positionId: '',
    roleIds: [],
  });
  createOpen.value = true;
}
async function createUser(): Promise<void> {
  if (props.readonly) return;
  const username = createForm.username.trim();
  const displayName = createForm.displayName.trim();
  if (!username || !displayName || !createForm.departmentId) {
    ElMessage.warning('请填写登录账号、姓名并选择主部门');
    return;
  }
  if (createForm.password.length < 8) {
    ElMessage.warning('初始密码至少 8 位');
    return;
  }
  saving.value = true;
  try {
    await iamApi.createUser({
      username,
      displayName,
      password: createForm.password,
      memberships: [
        {
          departmentId: createForm.departmentId,
          positionId: createForm.positionId || null,
          isPrimary: true,
          isDepartmentHead: false,
          active: true,
        },
      ],
      roles: createForm.roleIds.map((roleId) => ({
        roleId,
        dataScope: 'SELF' as const,
        scopeDepartmentId: null,
      })),
    });
    ElMessage.success('用户已创建，首次登录需修改密码');
    createOpen.value = false;
    emit('refresh');
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '用户创建失败'));
  } finally {
    saving.value = false;
  }
}
function openProfile(user: IamUser): void {
  if (props.readonly) return;
  profileUserId.value = user.id;
  Object.assign(profileForm, { displayName: user.displayName, active: user.active });
  profileOpen.value = true;
}
async function saveProfile(): Promise<void> {
  if (props.readonly || !profileUserId.value) return;
  const displayName = profileForm.displayName.trim();
  if (!displayName) {
    ElMessage.warning('用户姓名不能为空');
    return;
  }
  saving.value = true;
  try {
    await iamApi.updateUser(profileUserId.value, { displayName, active: profileForm.active });
    ElMessage.success('用户资料已更新');
    profileOpen.value = false;
    emit('refresh');
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '用户资料保存失败'));
  } finally {
    saving.value = false;
  }
}
async function toggleActive(user: IamUser): Promise<void> {
  if (props.readonly) return;
  try {
    await ElMessageBox.confirm(
      `确定${user.active ? '停用' : '启用'}账号「${user.displayName}」吗？`,
      '账号状态',
      { type: 'warning' },
    );
  } catch {
    return;
  }
  saving.value = true;
  try {
    await iamApi.updateUser(user.id, { active: !user.active });
    ElMessage.success(user.active ? '账号已停用' : '账号已启用');
    emit('refresh');
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '账号状态更新失败'));
  } finally {
    saving.value = false;
  }
}
async function deleteUser(user: IamUser): Promise<void> {
  if (props.readonly) return;
  try {
    await ElMessageBox.confirm(`确定删除账号「${user.displayName}」吗？删除后不可恢复。`, '删除账号', {
      type: 'warning',
      confirmButtonText: '删除',
    });
  } catch {
    return;
  }
  saving.value = true;
  try {
    await iamApi.deleteUser(user.id);
    ElMessage.success('账号已删除');
    emit('refresh');
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '账号删除失败'));
  } finally {
    saving.value = false;
  }
}
function openPassword(user: IamUser): void {
  if (props.readonly) return;
  passwordUserId.value = user.id;
  Object.assign(passwordForm, { password: '', confirm: '' });
  passwordOpen.value = true;
}
async function resetPassword(): Promise<void> {
  if (props.readonly || !passwordUserId.value) return;
  if (passwordForm.password.length < 8) {
    ElMessage.warning('新密码至少 8 位');
    return;
  }
  if (passwordForm.password !== passwordForm.confirm) {
    ElMessage.warning('两次输入的密码不一致');
    return;
  }
  saving.value = true;
  try {
    await iamApi.resetUserPassword(passwordUserId.value, passwordForm.password);
    ElMessage.success('密码已重置，用户下次登录需修改密码');
    passwordOpen.value = false;
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '密码重置失败'));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="user-authorization-panel">
    <div class="ui-toolbar">
      <el-input v-model="filters.keyword" clearable placeholder="姓名或登录账号" @keyup.enter="search" />
      <el-select v-model="filters.status" clearable placeholder="状态">
        <el-option label="正常" value="active" />
        <el-option label="停用" value="inactive" />
      </el-select>
      <el-button :icon="Search" type="primary" @click="search">查询</el-button>
      <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
      <div v-if="!readonly" class="ui-toolbar__end">
        <el-button :icon="Plus" @click="openCreate">新增用户</el-button>
      </div>
    </div>

    <UiDataList
      :columns="columns"
      :loading="loading"
      :rows="pagedUsers"
      empty-text="暂无符合条件的用户"
    >
      <template #cell-department="{ row }">{{ primaryDepartmentName(row) }}</template>
      <template #cell-positions="{ row }">{{ userPositionNames(row).join('、') || '—' }}</template>
      <template #cell-roles="{ row }">{{ userRoleNames(row).join('、') || '未授权' }}</template>
      <template #cell-active="{ row }">
        <el-tag :type="row.active ? 'success' : 'info'">{{ row.active ? '正常' : '停用' }}</el-tag>
      </template>
      <template #mobile-title="{ row }">
        <strong>{{ row.displayName }}</strong>
        <span class="ui-text-muted"> · {{ row.username }}</span>
      </template>
      <template #actions="{ row }">
        <template v-if="!readonly">
          <el-button :icon="Setting" link @click="openAssign(row)">分配授权</el-button>
          <el-button :icon="Edit" link @click="openProfile(row)">编辑</el-button>
          <el-button :icon="Key" link @click="openPassword(row)">重置密码</el-button>
          <el-button link type="danger" @click="toggleActive(row)">
            {{ row.active ? '停用' : '启用' }}
          </el-button>
          <el-button :icon="Delete" link type="danger" @click="deleteUser(row)">删除</el-button>
        </template>
      </template>
    </UiDataList>

    <UiPagination v-model:page="page" v-model:page-size="pageSize" :total="filteredUsers.length" />
  </section>

  <UiDialog
    v-model="assignOpen"
    :title="`分配授权：${assignUser?.displayName ?? ''}（${assignUser?.username ?? ''}）`"
    :width="920"
  >
    <section class="assignment-section">
      <div class="panel-subheading">
        <div>
          <strong>部门任职</strong>
          <small>主部门决定数据归属，负责人可用于流程办理人解析</small>
        </div>
        <el-button :icon="Plus" @click="addMembership">添加任职</el-button>
      </div>
      <div v-for="(item, index) in memberships" :key="item.key" class="assignment-card">
        <header>
          <strong>任职 {{ index + 1 }}</strong>
          <el-button
            :icon="Delete"
            circle
            text
            type="danger"
            aria-label="移除任职"
            title="移除任职"
            @click="memberships.splice(index, 1)"
          />
        </header>
        <div class="ui-fields">
          <el-form-item label="部门" required>
            <el-select
              v-model="item.departmentId"
              filterable
              placeholder="选择部门"
              @change="item.positionId = null"
            >
              <el-option
                v-for="department in departments"
                :key="department.id"
                :label="department.name"
                :value="department.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="岗位">
            <el-select v-model="item.positionId" clearable placeholder="可选">
              <el-option
                v-for="position in positionOptionsFor(item.departmentId)"
                :key="position.id"
                :label="position.name"
                :value="position.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="主部门">
            <el-checkbox v-model="item.isPrimary" @change="setPrimary(item)">设为主部门</el-checkbox>
          </el-form-item>
          <el-form-item label="部门负责人">
            <el-checkbox v-model="item.isDepartmentHead">是</el-checkbox>
          </el-form-item>
          <el-form-item label="任职状态">
            <el-switch v-model="item.active" active-text="启用" inactive-text="停用" />
          </el-form-item>
        </div>
      </div>
    </section>

    <section class="assignment-section">
      <div class="panel-subheading">
        <div>
          <strong>角色与数据范围</strong>
          <small>角色决定功能权限，数据范围决定可见单据</small>
        </div>
        <el-button :icon="Plus" @click="addRole">添加角色</el-button>
      </div>
      <div v-for="(item, index) in roleAssignments" :key="item.key" class="assignment-card">
        <header>
          <strong>授权 {{ index + 1 }}</strong>
          <el-button
            :icon="Delete"
            circle
            text
            type="danger"
            aria-label="移除角色"
            title="移除角色"
            @click="roleAssignments.splice(index, 1)"
          />
        </header>
        <div class="ui-fields">
          <el-form-item label="角色" required>
            <el-select v-model="item.roleId" filterable placeholder="选择角色">
              <el-option
                v-for="role in activeRoleOptions"
                :key="role.id"
                :label="role.name"
                :value="role.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="数据范围">
            <el-select v-model="item.dataScope" @change="normalizeScope(item)">
              <el-option
                v-for="scope in dataScopeOptions"
                :key="scope.value"
                :label="scope.label"
                :value="scope.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item
            v-if="['DEPARTMENT', 'DEPARTMENT_TREE'].includes(item.dataScope)"
            label="范围部门"
            required
          >
            <el-select v-model="item.scopeDepartmentId" filterable placeholder="选择范围部门">
              <el-option
                v-for="department in departments"
                :key="department.id"
                :label="department.name"
                :value="department.id"
              />
            </el-select>
          </el-form-item>
        </div>
      </div>
    </section>
    <template #footer>
      <el-button @click="assignOpen = false">取消</el-button>
      <el-button :loading="saving" type="primary" @click="saveAssignments">保存授权</el-button>
    </template>
  </UiDialog>

  <UiDialog v-model="createOpen" title="新增用户" :width="560">
    <el-form class="ui-fields" label-position="top">
      <el-form-item label="登录账号" required>
        <el-input v-model="createForm.username" maxlength="100" />
      </el-form-item>
      <el-form-item label="用户姓名" required>
        <el-input v-model="createForm.displayName" maxlength="100" />
      </el-form-item>
      <el-form-item label="初始密码" required>
        <el-input
          v-model="createForm.password"
          show-password
          type="password"
          maxlength="128"
          placeholder="至少 8 位"
        />
      </el-form-item>
      <el-form-item label="主部门" required>
        <el-select
          v-model="createForm.departmentId"
          filterable
          placeholder="选择主部门"
          @change="createForm.positionId = ''"
        >
          <el-option
            v-for="department in departments"
            :key="department.id"
            :label="department.name"
            :value="department.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="岗位">
        <el-select v-model="createForm.positionId" clearable placeholder="可选">
          <el-option
            v-for="position in positionOptionsFor(createForm.departmentId)"
            :key="position.id"
            :label="position.name"
            :value="position.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item class="ui-field-full" label="初始角色">
        <el-select
          v-model="createForm.roleIds"
          multiple
          clearable
          placeholder="可选，默认仅本人数据范围"
        >
          <el-option
            v-for="role in activeRoleOptions"
            :key="role.id"
            :label="role.name"
            :value="role.id"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="createOpen = false">取消</el-button>
      <el-button :loading="saving" type="primary" @click="createUser">创建用户</el-button>
    </template>
  </UiDialog>

  <UiDialog v-model="profileOpen" title="编辑用户资料" :width="460">
    <el-form label-position="top">
      <el-form-item label="登录账号">
        <el-input :model-value="profileUser?.username ?? ''" disabled />
      </el-form-item>
      <el-form-item label="用户姓名" required>
        <el-input v-model="profileForm.displayName" maxlength="100" />
      </el-form-item>
      <el-form-item label="账号状态">
        <el-switch v-model="profileForm.active" active-text="启用" inactive-text="停用" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="profileOpen = false">取消</el-button>
      <el-button :loading="saving" type="primary" @click="saveProfile">保存</el-button>
    </template>
  </UiDialog>

  <UiDialog v-model="passwordOpen" title="重置登录密码" :width="460">
    <el-form label-position="top">
      <el-form-item label="新密码" required>
        <el-input
          v-model="passwordForm.password"
          type="password"
          show-password
          maxlength="128"
          placeholder="至少 8 位"
        />
      </el-form-item>
      <el-form-item label="确认密码" required>
        <el-input v-model="passwordForm.confirm" type="password" show-password maxlength="128" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="passwordOpen = false">取消</el-button>
      <el-button :loading="saving" type="primary" @click="resetPassword">重置密码</el-button>
    </template>
  </UiDialog>
</template>

<style scoped>
.user-authorization-panel {
  min-width: 0;
}
.assignment-section {
  min-width: 0;
  margin-bottom: 24px;
}
.assignment-section:last-child {
  margin-bottom: 0;
}
.panel-subheading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: var(--space-sm);
}
.panel-subheading > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-xxs);
}
.panel-subheading strong {
  color: var(--color-text);
  font-size: var(--font-size-title-sm);
  font-weight: 600;
}
.panel-subheading small {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-caption);
  line-height: 1.5;
}
.panel-subheading :deep(.el-button) {
  height: var(--control-h-sm);
  padding-inline: 14px;
  font-size: var(--font-size-caption);
}
.assignment-card {
  min-width: 0;
  margin-bottom: 12px;
  padding: 16px;
  background: var(--color-canvas);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.assignment-card:last-child {
  margin-bottom: 0;
}
.assignment-card header {
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  margin-bottom: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border-soft);
}
.assignment-card header strong {
  font-size: var(--font-size-title-sm);
  font-weight: 600;
}
.assignment-card :deep(.el-form-item) {
  margin-bottom: 16px;
}
.assignment-card :deep(.el-checkbox) {
  min-height: var(--control-h);
  margin-right: 0;
}
html[data-layout='compact'] .assignment-card {
  padding: 12px;
}
</style>
