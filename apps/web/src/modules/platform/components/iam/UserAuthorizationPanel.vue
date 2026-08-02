<script setup lang="ts">
import { Delete, Edit, Key, Plus, Search, Setting } from '@element-plus/icons-vue';
import {
  ElButton,
  ElCheckbox,
  ElDialog,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';
import { computed, reactive, ref } from 'vue';
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

const keyword = ref('');
const statusFilter = ref<'all' | 'active' | 'inactive'>('all');
const saving = ref(false);

const assignDialogOpen = ref(false);
const assignUserId = ref<string | null>(null);
const memberships = ref<MembershipDraft[]>([]);
const roleAssignments = ref<RoleDraft[]>([]);

const createDialogOpen = ref(false);
const createForm = reactive({
  username: '',
  displayName: '',
  password: '',
  departmentId: '' as string,
  positionId: null as string | null,
  roleIds: [] as string[],
});
const profileDialogOpen = ref(false);
const profileUserId = ref<string | null>(null);
const profileForm = reactive({ displayName: '', active: true });
const passwordDialogOpen = ref(false);
const passwordUserId = ref<string | null>(null);
const passwordForm = reactive({ password: '', confirm: '' });

const departments = computed(() => flattenDepartments(props.departments));
const departmentNames = computed(
  () => new Map(departments.value.map((item) => [item.id, item.name])),
);
const positionNames = computed(() => new Map(props.positions.map((item) => [item.id, item.name])));
const roleNames = computed(() => new Map(props.roles.map((item) => [item.id, item.name])));

const assignUser = computed(
  () => props.users.find((user) => user.id === assignUserId.value) ?? null,
);
const profileUser = computed(
  () => props.users.find((user) => user.id === profileUserId.value) ?? null,
);
const filteredUsers = computed(() => {
  const query = keyword.value.trim().toLowerCase();
  return props.users.filter((user) => {
    if (statusFilter.value === 'active' && !user.active) return false;
    if (statusFilter.value === 'inactive' && user.active) return false;
    return !query || `${user.displayName} ${user.username}`.toLowerCase().includes(query);
  });
});

function primaryDepartmentName(value: unknown): string {
  const user = value as IamUser;
  const primary = user.memberships.find((item) => item.isPrimary) ?? user.memberships[0];
  return primary ? (departmentNames.value.get(primary.departmentId) ?? '—') : '—';
}

function userPositionNames(value: unknown): string[] {
  const user = value as IamUser;
  return [
    ...new Set(
      user.memberships
        .map((item) => (item.positionId ? positionNames.value.get(item.positionId) : null))
        .filter((name): name is string => Boolean(name)),
    ),
  ];
}

function userRoleNames(value: unknown): string[] {
  const user = value as IamUser;
  return user.roles
    .map((item) => roleNames.value.get(item.roleId))
    .filter((name): name is string => Boolean(name));
}

function openAssign(value: unknown): void {
  const user = value as IamUser;
  assignUserId.value = user.id;
  memberships.value = user.memberships.map((item) => ({
    key: item.id || crypto.randomUUID(),
    departmentId: item.departmentId,
    positionId: item.positionId,
    isPrimary: item.isPrimary,
    isDepartmentHead: item.isDepartmentHead,
    active: item.active,
  }));
  roleAssignments.value = user.roles.map((item) => ({
    key: item.assignmentId || crypto.randomUUID(),
    roleId: item.roleId,
    dataScope: item.dataScope,
    scopeDepartmentId: item.scopeDepartmentId,
  }));
  assignDialogOpen.value = true;
}

function addMembership(): void {
  memberships.value.push({
    key: crypto.randomUUID(),
    departmentId: '',
    positionId: null,
    isPrimary: memberships.value.length === 0,
    isDepartmentHead: false,
    active: true,
  });
}

function addRole(): void {
  roleAssignments.value.push({
    key: crypto.randomUUID(),
    roleId: '',
    dataScope: 'SELF',
    scopeDepartmentId: null,
  });
}

function setPrimary(value: unknown): void {
  const target = value as MembershipDraft;
  if (!target.isPrimary) return;
  memberships.value.forEach((item) => {
    if (item.key !== target.key) item.isPrimary = false;
  });
}

function positionsFor(departmentId: string): Position[] {
  return props.positions.filter(
    (position) =>
      position.active && (position.departmentId === departmentId || position.departmentId === null),
  );
}

function normalizeScope(value: unknown): void {
  const item = value as RoleDraft;
  if (item.dataScope === 'SELF' || item.dataScope === 'ALL') item.scopeDepartmentId = null;
}

function validate(): string | null {
  if (memberships.value.length === 0) return '用户至少需要一个部门任职';
  if (memberships.value.some((item) => !item.departmentId)) return '任职部门不能为空';
  if (
    new Set(memberships.value.map((item) => item.departmentId)).size !== memberships.value.length
  ) {
    return '同一用户不能重复加入同一部门';
  }
  if (memberships.value.length > 0 && !memberships.value.some((item) => item.isPrimary)) {
    return '请设置一个主部门';
  }
  if (roleAssignments.value.some((item) => !item.roleId)) return '授权角色不能为空';
  if (
    new Set(roleAssignments.value.map((item) => item.roleId)).size !== roleAssignments.value.length
  ) {
    return '同一角色不能重复授权';
  }
  if (
    roleAssignments.value.some(
      (item) =>
        ['DEPARTMENT', 'DEPARTMENT_TREE'].includes(item.dataScope) && !item.scopeDepartmentId,
    )
  ) {
    return '部门或部门树数据范围必须明确选择范围部门';
  }
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
    assignDialogOpen.value = false;
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
    positionId: null,
    roleIds: [],
  });
  createDialogOpen.value = true;
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
          positionId: createForm.positionId,
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
    createDialogOpen.value = false;
    emit('refresh');
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '用户创建失败'));
  } finally {
    saving.value = false;
  }
}

function openProfile(value: unknown): void {
  const user = value as IamUser;
  if (props.readonly) return;
  profileUserId.value = user.id;
  Object.assign(profileForm, { displayName: user.displayName, active: user.active });
  profileDialogOpen.value = true;
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
    profileDialogOpen.value = false;
    emit('refresh');
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '用户资料保存失败'));
  } finally {
    saving.value = false;
  }
}

async function toggleActive(value: unknown): Promise<void> {
  const user = value as IamUser;
  if (props.readonly) return;
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

function openPassword(value: unknown): void {
  const user = value as IamUser;
  if (props.readonly) return;
  passwordUserId.value = user.id;
  Object.assign(passwordForm, { password: '', confirm: '' });
  passwordDialogOpen.value = true;
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
    passwordDialogOpen.value = false;
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '密码重置失败'));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div v-loading="loading" class="iam-user-table-panel">
    <div class="platform-toolbar">
      <div class="platform-inline-actions">
        <ElInput
          v-model="keyword"
          class="platform-toolbar__search"
          clearable
          placeholder="搜索姓名或账号"
          style="width: 220px"
        >
          <template #prefix
            ><ElIcon><Search /></ElIcon
          ></template>
        </ElInput>
        <ElSelect v-model="statusFilter" style="width: 120px">
          <ElOption label="全部状态" value="all" />
          <ElOption label="正常" value="active" />
          <ElOption label="停用" value="inactive" />
        </ElSelect>
      </div>
      <ElButton v-if="!readonly" type="primary" @click="openCreate">
        <ElIcon><Plus /></ElIcon>新增用户
      </ElButton>
    </div>

    <ElTable :data="filteredUsers" empty-text="暂无用户" row-key="id" scrollbar-always-on>
      <ElTableColumn label="姓名" min-width="120">
        <template #default="{ row }">
          <strong>{{ row.displayName }}</strong>
        </template>
      </ElTableColumn>
      <ElTableColumn label="登录账号" min-width="120" prop="username" />
      <ElTableColumn label="主部门" min-width="120">
        <template #default="{ row }">{{ primaryDepartmentName(row) }}</template>
      </ElTableColumn>
      <ElTableColumn label="岗位" min-width="140">
        <template #default="{ row }">
          <template v-if="userPositionNames(row).length > 0">
            <ElTag
              v-for="name in userPositionNames(row)"
              :key="name"
              class="iam-cell-tag"
              effect="plain"
              size="small"
              >{{ name }}</ElTag
            >
          </template>
          <span v-else class="platform-muted">—</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="角色" min-width="180">
        <template #default="{ row }">
          <template v-if="userRoleNames(row).length > 0">
            <ElTag
              v-for="name in userRoleNames(row)"
              :key="name"
              class="iam-cell-tag"
              size="small"
              type="info"
              >{{ name }}</ElTag
            >
          </template>
          <span v-else class="platform-muted">未授权</span>
        </template>
      </ElTableColumn>
      <ElTableColumn align="center" label="状态" width="90">
        <template #default="{ row }">
          <ElTag :type="row.active ? 'success' : 'info'" effect="plain" size="small">
            {{ row.active ? '正常' : '停用' }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn v-if="!readonly" label="操作" width="270">
        <template #default="{ row }">
          <ElButton link size="small" type="primary" @click="openAssign(row)">
            <ElIcon><Setting /></ElIcon>分配授权
          </ElButton>
          <ElButton link size="small" type="primary" @click="openProfile(row)">
            <ElIcon><Edit /></ElIcon>编辑
          </ElButton>
          <ElButton link size="small" type="warning" @click="openPassword(row)">
            <ElIcon><Key /></ElIcon>重置密码
          </ElButton>
          <ElButton
            link
            size="small"
            :type="row.active ? 'danger' : 'success'"
            @click="toggleActive(row)"
          >
            {{ row.active ? '停用' : '启用' }}
          </ElButton>
        </template>
      </ElTableColumn>
    </ElTable>
  </div>

  <ElDialog
    v-model="assignDialogOpen"
    :title="`分配授权：${assignUser?.displayName ?? ''}（${assignUser?.username ?? ''}）`"
    top="6vh"
    width="880px"
  >
    <div class="platform-subheading">
      <div>
        <strong>部门任职</strong><small>支持一人多部门、多岗位，并且只能有一个主部门</small>
      </div>
      <ElButton v-if="!readonly" @click="addMembership"
        ><ElIcon><Plus /></ElIcon>添加任职</ElButton
      >
    </div>
    <ElTable :data="memberships" empty-text="尚未配置部门任职" row-key="key" scrollbar-always-on>
      <ElTableColumn label="部门" min-width="150">
        <template #default="{ row }">
          <ElSelect
            v-model="row.departmentId"
            :disabled="readonly"
            filterable
            placeholder="选择部门"
            @change="row.positionId = null"
          >
            <ElOption
              v-for="item in departments"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </ElSelect>
        </template>
      </ElTableColumn>
      <ElTableColumn label="岗位" min-width="130">
        <template #default="{ row }">
          <ElSelect
            v-model="row.positionId"
            clearable
            :disabled="readonly"
            filterable
            placeholder="可选"
          >
            <ElOption
              v-for="item in positionsFor(row.departmentId)"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </ElSelect>
        </template>
      </ElTableColumn>
      <ElTableColumn align="center" label="主部门" width="82">
        <template #default="{ row }"
          ><ElCheckbox v-model="row.isPrimary" :disabled="readonly" @change="setPrimary(row)"
        /></template>
      </ElTableColumn>
      <ElTableColumn align="center" label="部门负责人" width="102">
        <template #default="{ row }"
          ><ElCheckbox v-model="row.isDepartmentHead" :disabled="readonly"
        /></template>
      </ElTableColumn>
      <ElTableColumn align="center" label="启用" width="72">
        <template #default="{ row }"
          ><ElSwitch v-model="row.active" :disabled="readonly"
        /></template>
      </ElTableColumn>
      <ElTableColumn v-if="!readonly" label="" width="46">
        <template #default="{ $index }"
          ><ElButton circle text type="danger" @click="memberships.splice($index, 1)"
            ><ElIcon><Delete /></ElIcon></ElButton
        ></template>
      </ElTableColumn>
    </ElTable>

    <div class="platform-subheading platform-subheading--spaced">
      <div>
        <strong>角色与数据范围</strong
        ><small>功能权限和数据权限分开授予，避免角色编码承载组织范围</small>
      </div>
      <ElButton v-if="!readonly" @click="addRole"
        ><ElIcon><Plus /></ElIcon>添加角色</ElButton
      >
    </div>
    <ElTable :data="roleAssignments" empty-text="尚未授予角色" row-key="key" scrollbar-always-on>
      <ElTableColumn label="角色" min-width="180">
        <template #default="{ row }">
          <ElSelect v-model="row.roleId" :disabled="readonly" filterable placeholder="选择角色">
            <ElOption
              v-for="role in roles.filter((item) => item.active)"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </ElSelect>
        </template>
      </ElTableColumn>
      <ElTableColumn label="数据范围" min-width="170">
        <template #default="{ row }">
          <ElSelect v-model="row.dataScope" :disabled="readonly" @change="normalizeScope(row)">
            <ElOption label="仅本人" value="SELF" />
            <ElOption label="指定部门" value="DEPARTMENT" />
            <ElOption label="指定部门及下级" value="DEPARTMENT_TREE" />
            <ElOption label="全部数据" value="ALL" />
          </ElSelect>
        </template>
      </ElTableColumn>
      <ElTableColumn label="范围部门" min-width="170">
        <template #default="{ row }">
          <ElSelect
            v-if="['DEPARTMENT', 'DEPARTMENT_TREE'].includes(row.dataScope)"
            v-model="row.scopeDepartmentId"
            :disabled="readonly"
            filterable
            placeholder="选择范围部门（必选）"
          >
            <ElOption
              v-for="item in departments"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </ElSelect>
          <span v-else class="platform-muted">不适用</span>
        </template>
      </ElTableColumn>
      <ElTableColumn v-if="!readonly" label="" width="46">
        <template #default="{ $index }"
          ><ElButton circle text type="danger" @click="roleAssignments.splice($index, 1)"
            ><ElIcon><Delete /></ElIcon></ElButton
        ></template>
      </ElTableColumn>
    </ElTable>
    <template #footer>
      <ElButton @click="assignDialogOpen = false">取消</ElButton>
      <ElButton v-if="!readonly" :loading="saving" type="primary" @click="saveAssignments"
        >保存授权</ElButton
      >
    </template>
  </ElDialog>

  <ElDialog v-model="createDialogOpen" title="新增用户" width="520px">
    <ElForm label-position="top">
      <div class="platform-form-grid">
        <ElFormItem label="登录账号">
          <ElInput v-model="createForm.username" maxlength="100" placeholder="例如：zhangsan" />
        </ElFormItem>
        <ElFormItem label="用户姓名">
          <ElInput v-model="createForm.displayName" maxlength="100" placeholder="例如：张三" />
        </ElFormItem>
      </div>
      <ElFormItem label="初始密码">
        <ElInput
          v-model="createForm.password"
          maxlength="128"
          placeholder="至少 8 位，首次登录强制修改"
          show-password
          type="password"
        />
      </ElFormItem>
      <div class="platform-form-grid">
        <ElFormItem label="主部门">
          <ElSelect
            v-model="createForm.departmentId"
            filterable
            placeholder="选择主部门"
            @change="createForm.positionId = null"
          >
            <ElOption
              v-for="item in departments"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="岗位（可选）">
          <ElSelect v-model="createForm.positionId" clearable filterable placeholder="可选">
            <ElOption
              v-for="item in positionsFor(createForm.departmentId)"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </ElSelect>
        </ElFormItem>
      </div>
      <ElFormItem label="初始角色（可选，默认仅本人数据范围，可在保存后调整）">
        <ElSelect v-model="createForm.roleIds" clearable filterable multiple placeholder="可选">
          <ElOption
            v-for="role in roles.filter((item) => item.active)"
            :key="role.id"
            :label="role.name"
            :value="role.id"
          />
        </ElSelect>
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="createDialogOpen = false">取消</ElButton>
      <ElButton :loading="saving" type="primary" @click="createUser">创建用户</ElButton>
    </template>
  </ElDialog>

  <ElDialog v-model="profileDialogOpen" title="编辑用户资料" width="420px">
    <ElForm label-position="top">
      <ElFormItem label="登录账号">
        <ElInput :model-value="profileUser?.username ?? ''" disabled />
      </ElFormItem>
      <ElFormItem label="用户姓名">
        <ElInput v-model="profileForm.displayName" maxlength="100" />
      </ElFormItem>
      <ElFormItem label="账号状态">
        <ElSwitch v-model="profileForm.active" active-text="启用" inactive-text="停用" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="profileDialogOpen = false">取消</ElButton>
      <ElButton :loading="saving" type="primary" @click="saveProfile">保存</ElButton>
    </template>
  </ElDialog>

  <ElDialog v-model="passwordDialogOpen" title="重置登录密码" width="420px">
    <ElForm label-position="top">
      <ElFormItem label="新密码">
        <ElInput
          v-model="passwordForm.password"
          maxlength="128"
          placeholder="至少 8 位"
          show-password
          type="password"
        />
      </ElFormItem>
      <ElFormItem label="确认密码">
        <ElInput v-model="passwordForm.confirm" maxlength="128" show-password type="password" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="passwordDialogOpen = false">取消</ElButton>
      <ElButton :loading="saving" type="primary" @click="resetPassword">重置密码</ElButton>
    </template>
  </ElDialog>
</template>

<style scoped>
.iam-user-table-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.platform-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.iam-cell-tag {
  margin: 2px 4px 2px 0;
}
</style>
