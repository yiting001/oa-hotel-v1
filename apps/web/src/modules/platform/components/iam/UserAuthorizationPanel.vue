<script setup lang="ts">
import {
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { computed, reactive, ref } from 'vue';
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

const filters = reactive({
  keyword: '',
  status: undefined as 'active' | 'inactive' | undefined,
});
const appliedFilters = reactive({ ...filters });
const saving = ref(false);

const assignOpen = ref(false);
const assignUserId = ref<string | null>(null);
const memberships = ref<MembershipDraft[]>([]);
const roleAssignments = ref<RoleDraft[]>([]);

const createOpen = ref(false);
const createForm = reactive({
  username: '',
  displayName: '',
  password: '',
  departmentId: undefined as string | undefined,
  positionId: undefined as string | undefined,
  roleIds: [] as string[],
});
const profileOpen = ref(false);
const profileUserId = ref<string | null>(null);
const profileForm = reactive({ displayName: '', active: true });
const passwordOpen = ref(false);
const passwordUserId = ref<string | null>(null);
const passwordForm = reactive({ password: '', confirm: '' });

const departments = computed(() => flattenDepartments(props.departments));
const departmentOptions = computed(() =>
  departments.value.map((item) => ({ value: item.id, label: item.name })),
);
const departmentNames = computed(
  () => new Map(departments.value.map((item) => [item.id, item.name])),
);
const positionNames = computed(() => new Map(props.positions.map((item) => [item.id, item.name])));
const roleNames = computed(() => new Map(props.roles.map((item) => [item.id, item.name])));
const activeRoleOptions = computed(() =>
  props.roles.filter((item) => item.active).map((item) => ({ value: item.id, label: item.name })),
);

const assignUser = computed(
  () => props.users.find((user) => user.id === assignUserId.value) ?? null,
);
const profileUser = computed(
  () => props.users.find((user) => user.id === profileUserId.value) ?? null,
);

const filteredUsers = computed(() => {
  const query = appliedFilters.keyword.trim().toLowerCase();
  return props.users.filter((user) => {
    if (appliedFilters.status === 'active' && !user.active) return false;
    if (appliedFilters.status === 'inactive' && user.active) return false;
    return !query || `${user.displayName} ${user.username}`.toLowerCase().includes(query);
  });
});

const columns = [
  { title: '姓名', key: 'displayName', width: 130 },
  { title: '登录账号', dataIndex: 'username', width: 140 },
  { title: '主部门', key: 'primaryDepartment', width: 130 },
  { title: '岗位', key: 'positions', width: 150 },
  { title: '角色', key: 'roles' },
  { title: '状态', key: 'status', width: 90, align: 'center' as const },
  ...(props.readonly ? [] : [{ title: '操作', key: 'actions', width: 360 }]),
];

function filterByLabel(input: string, option: { label?: string }): boolean {
  return (option.label ?? '').includes(input);
}

function search(): void {
  Object.assign(appliedFilters, filters);
}

function resetFilters(): void {
  Object.assign(filters, { keyword: '', status: undefined });
  search();
}

function primaryDepartmentName(user: IamUser): string {
  const primary = user.memberships.find((item) => item.isPrimary) ?? user.memberships[0];
  return primary ? (departmentNames.value.get(primary.departmentId) ?? '-') : '-';
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
  if (!target.isPrimary) return;
  memberships.value.forEach((item) => {
    if (item.key !== target.key) item.isPrimary = false;
  });
}

function positionOptionsFor(departmentId: string): Array<{ value: string; label: string }> {
  return props.positions
    .filter(
      (position) =>
        position.active &&
        (position.departmentId === departmentId || position.departmentId === null),
    )
    .map((item) => ({ value: item.id, label: item.name }));
}

function normalizeScope(item: RoleDraft): void {
  if (item.dataScope === 'SELF' || item.dataScope === 'ALL') item.scopeDepartmentId = null;
}

const membershipColumns = [
  { title: '部门', key: 'department', width: 190 },
  { title: '岗位', key: 'position', width: 170 },
  { title: '主部门', key: 'isPrimary', width: 80, align: 'center' as const },
  { title: '部门负责人', key: 'isDepartmentHead', width: 100, align: 'center' as const },
  { title: '启用', key: 'active', width: 70, align: 'center' as const },
  { title: '', key: 'remove', width: 50 },
];

const roleColumns = [
  { title: '角色', key: 'role', width: 220 },
  { title: '数据范围', key: 'dataScope', width: 180 },
  { title: '范围部门', key: 'scopeDepartment' },
  { title: '', key: 'remove', width: 50 },
];

const dataScopeOptions = [
  { value: 'SELF', label: '仅本人' },
  { value: 'DEPARTMENT', label: '指定部门' },
  { value: 'DEPARTMENT_TREE', label: '指定部门及下级' },
  { value: 'ALL', label: '全部数据' },
];

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
    message.warning(error);
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
    message.success('用户任职与角色授权已保存');
    assignOpen.value = false;
    emit('refresh');
  } catch (cause) {
    message.error(platformErrorMessage(cause, '用户授权保存失败'));
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
    departmentId: undefined,
    positionId: undefined,
    roleIds: [],
  });
  createOpen.value = true;
}

async function createUser(): Promise<void> {
  if (props.readonly) return;
  const username = createForm.username.trim();
  const displayName = createForm.displayName.trim();
  if (!username || !displayName || !createForm.departmentId) {
    message.warning('请填写登录账号、姓名并选择主部门');
    return;
  }
  if (createForm.password.length < 8) {
    message.warning('初始密码至少 8 位');
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
          positionId: createForm.positionId ?? null,
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
    message.success('用户已创建，首次登录需修改密码');
    createOpen.value = false;
    emit('refresh');
  } catch (cause) {
    message.error(platformErrorMessage(cause, '用户创建失败'));
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
    message.warning('用户姓名不能为空');
    return;
  }
  saving.value = true;
  try {
    await iamApi.updateUser(profileUserId.value, { displayName, active: profileForm.active });
    message.success('用户资料已更新');
    profileOpen.value = false;
    emit('refresh');
  } catch (cause) {
    message.error(platformErrorMessage(cause, '用户资料保存失败'));
  } finally {
    saving.value = false;
  }
}

async function toggleActive(user: IamUser): Promise<void> {
  if (props.readonly) return;
  saving.value = true;
  try {
    await iamApi.updateUser(user.id, { active: !user.active });
    message.success(user.active ? '账号已停用' : '账号已启用');
    emit('refresh');
  } catch (cause) {
    message.error(platformErrorMessage(cause, '账号状态更新失败'));
  } finally {
    saving.value = false;
  }
}

async function deleteUser(user: IamUser): Promise<void> {
  if (props.readonly) return;
  saving.value = true;
  try {
    await iamApi.deleteUser(user.id);
    message.success('账号已删除');
    emit('refresh');
  } catch (cause) {
    message.error(platformErrorMessage(cause, '账号删除失败'));
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
    message.warning('新密码至少 8 位');
    return;
  }
  if (passwordForm.password !== passwordForm.confirm) {
    message.warning('两次输入的密码不一致');
    return;
  }
  saving.value = true;
  try {
    await iamApi.resetUserPassword(passwordUserId.value, passwordForm.password);
    message.success('密码已重置，用户下次登录需修改密码');
    passwordOpen.value = false;
  } catch (cause) {
    message.error(platformErrorMessage(cause, '密码重置失败'));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="iam-user-panel">
    <a-card size="small" style="margin-bottom: 16px">
      <a-space wrap>
        <a-input
          v-model:value="filters.keyword"
          allow-clear
          placeholder="姓名或登录账号"
          style="width: 200px"
          @press-enter="search"
        />
        <a-select
          v-model:value="filters.status"
          allow-clear
          :options="[
            { value: 'active', label: '正常' },
            { value: 'inactive', label: '停用' },
          ]"
          placeholder="状态"
          style="width: 120px"
        />
        <a-button type="primary" @click="search">
          <template #icon><SearchOutlined /></template>
          查询
        </a-button>
        <a-button @click="resetFilters">
          <template #icon><ReloadOutlined /></template>
          重置
        </a-button>
        <a-button v-if="!readonly" type="primary" ghost @click="openCreate">
          <template #icon><PlusOutlined /></template>
          新增用户
        </a-button>
      </a-space>
    </a-card>

    <a-table
      :columns="columns"
      :data-source="filteredUsers"
      :loading="loading"
      :pagination="{ pageSize: 20, showTotal: (total: number) => `共 ${total} 名用户` }"
      row-key="id"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'displayName'">
          <strong>{{ (record as IamUser).displayName }}</strong>
        </template>
        <template v-else-if="column.key === 'primaryDepartment'">
          {{ primaryDepartmentName(record as IamUser) }}
        </template>
        <template v-else-if="column.key === 'positions'">
          <template v-if="userPositionNames(record as IamUser).length > 0">
            <a-tag v-for="name in userPositionNames(record as IamUser)" :key="name">{{
              name
            }}</a-tag>
          </template>
          <span v-else>-</span>
        </template>
        <template v-else-if="column.key === 'roles'">
          <template v-if="userRoleNames(record as IamUser).length > 0">
            <a-tag v-for="name in userRoleNames(record as IamUser)" :key="name" color="blue">{{
              name
            }}</a-tag>
          </template>
          <span v-else>未授权</span>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="(record as IamUser).active ? 'green' : 'default'">
            {{ (record as IamUser).active ? '正常' : '停用' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-space size="small">
            <a-button size="small" type="link" @click="openAssign(record as IamUser)">
              <template #icon><SettingOutlined /></template>
              分配授权
            </a-button>
            <a-button size="small" type="link" @click="openProfile(record as IamUser)">
              <template #icon><EditOutlined /></template>
              编辑
            </a-button>
            <a-button size="small" type="link" @click="openPassword(record as IamUser)">
              <template #icon><KeyOutlined /></template>
              重置密码
            </a-button>
            <a-popconfirm
              :title="(record as IamUser).active ? '确定停用该账号吗？' : '确定启用该账号吗？'"
              @confirm="toggleActive(record as IamUser)"
            >
              <a-button danger size="small" type="link">
                {{ (record as IamUser).active ? '停用' : '启用' }}
              </a-button>
            </a-popconfirm>
            <a-popconfirm
              title="确定删除该账号吗？删除后不可恢复。"
              ok-text="删除"
              :ok-button-props="{ danger: true }"
              @confirm="deleteUser(record as IamUser)"
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
      v-model:open="assignOpen"
      :confirm-loading="saving"
      :title="`分配授权：${assignUser?.displayName ?? ''}（${assignUser?.username ?? ''}）`"
      width="920px"
      @ok="saveAssignments"
    >
      <div class="iam-assign-section">
        <div class="iam-assign-section__heading">
          <div>
            <strong>部门任职</strong>
            <span class="iam-assign-section__hint"
              >支持一人多部门、多岗位，并且只能有一个主部门</span
            >
          </div>
          <a-button size="small" @click="addMembership">
            <template #icon><PlusOutlined /></template>
            添加任职
          </a-button>
        </div>
        <a-table
          :columns="membershipColumns"
          :data-source="memberships"
          :pagination="false"
          row-key="key"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'department'">
              <a-select
                v-model:value="(record as MembershipDraft).departmentId"
                :options="departmentOptions"
                placeholder="选择部门"
                show-search
                style="width: 100%"
                :filter-option="filterByLabel"
                @change="(record as MembershipDraft).positionId = null"
              />
            </template>
            <template v-else-if="column.key === 'position'">
              <a-select
                v-model:value="(record as MembershipDraft).positionId"
                allow-clear
                :options="positionOptionsFor((record as MembershipDraft).departmentId)"
                placeholder="可选"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'isPrimary'">
              <a-checkbox
                v-model:checked="(record as MembershipDraft).isPrimary"
                @change="setPrimary(record as MembershipDraft)"
              />
            </template>
            <template v-else-if="column.key === 'isDepartmentHead'">
              <a-checkbox v-model:checked="(record as MembershipDraft).isDepartmentHead" />
            </template>
            <template v-else-if="column.key === 'active'">
              <a-switch v-model:checked="(record as MembershipDraft).active" size="small" />
            </template>
            <template v-else-if="column.key === 'remove'">
              <a-button
                danger
                size="small"
                type="text"
                @click="
                  memberships.splice(
                    memberships.findIndex((item) => item.key === (record as MembershipDraft).key),
                    1,
                  )
                "
              >
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </template>
          </template>
        </a-table>
      </div>

      <div class="iam-assign-section">
        <div class="iam-assign-section__heading">
          <div>
            <strong>角色与数据范围</strong>
            <span class="iam-assign-section__hint">功能权限和数据权限分开授予</span>
          </div>
          <a-button size="small" @click="addRole">
            <template #icon><PlusOutlined /></template>
            添加角色
          </a-button>
        </div>
        <a-table
          :columns="roleColumns"
          :data-source="roleAssignments"
          :pagination="false"
          row-key="key"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'role'">
              <a-select
                v-model:value="(record as RoleDraft).roleId"
                :options="activeRoleOptions"
                placeholder="选择角色"
                show-search
                style="width: 100%"
                :filter-option="filterByLabel"
              />
            </template>
            <template v-else-if="column.key === 'dataScope'">
              <a-select
                v-model:value="(record as RoleDraft).dataScope"
                :options="dataScopeOptions"
                style="width: 100%"
                @change="normalizeScope(record as RoleDraft)"
              />
            </template>
            <template v-else-if="column.key === 'scopeDepartment'">
              <a-select
                v-if="['DEPARTMENT', 'DEPARTMENT_TREE'].includes((record as RoleDraft).dataScope)"
                v-model:value="(record as RoleDraft).scopeDepartmentId"
                :options="departmentOptions"
                placeholder="选择范围部门（必选）"
                show-search
                style="width: 100%"
                :filter-option="filterByLabel"
              />
              <span v-else>不适用</span>
            </template>
            <template v-else-if="column.key === 'remove'">
              <a-button
                danger
                size="small"
                type="text"
                @click="
                  roleAssignments.splice(
                    roleAssignments.findIndex((item) => item.key === (record as RoleDraft).key),
                    1,
                  )
                "
              >
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </template>
          </template>
        </a-table>
      </div>
    </a-modal>

    <a-modal
      v-model:open="createOpen"
      :confirm-loading="saving"
      ok-text="创建用户"
      title="新增用户"
      width="560px"
      @ok="createUser"
    >
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="登录账号" required>
              <a-input
                v-model:value="createForm.username"
                :maxlength="100"
                placeholder="例如：zhangsan"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="用户姓名" required>
              <a-input
                v-model:value="createForm.displayName"
                :maxlength="100"
                placeholder="例如：张三"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="初始密码" required>
          <a-input-password
            v-model:value="createForm.password"
            :maxlength="128"
            placeholder="至少 8 位，首次登录强制修改"
          />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="主部门" required>
              <a-select
                v-model:value="createForm.departmentId"
                :options="departmentOptions"
                placeholder="选择主部门"
                show-search
                :filter-option="filterByLabel"
                @change="createForm.positionId = undefined"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="岗位（可选）">
              <a-select
                v-model:value="createForm.positionId"
                allow-clear
                :options="
                  createForm.departmentId ? positionOptionsFor(createForm.departmentId) : []
                "
                placeholder="可选"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="初始角色（可选，默认仅本人数据范围，可在分配授权中调整）">
          <a-select
            v-model:value="createForm.roleIds"
            allow-clear
            mode="multiple"
            :options="activeRoleOptions"
            placeholder="可选"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="profileOpen"
      :confirm-loading="saving"
      title="编辑用户资料"
      width="460px"
      @ok="saveProfile"
    >
      <a-form layout="vertical">
        <a-form-item label="登录账号">
          <a-input disabled :value="profileUser?.username ?? ''" />
        </a-form-item>
        <a-form-item label="用户姓名" required>
          <a-input v-model:value="profileForm.displayName" :maxlength="100" />
        </a-form-item>
        <a-form-item label="账号状态">
          <a-switch
            v-model:checked="profileForm.active"
            checked-children="启用"
            un-checked-children="停用"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="passwordOpen"
      :confirm-loading="saving"
      ok-text="重置密码"
      title="重置登录密码"
      width="460px"
      @ok="resetPassword"
    >
      <a-form layout="vertical">
        <a-form-item label="新密码" required>
          <a-input-password
            v-model:value="passwordForm.password"
            :maxlength="128"
            placeholder="至少 8 位"
          />
        </a-form-item>
        <a-form-item label="确认密码" required>
          <a-input-password v-model:value="passwordForm.confirm" :maxlength="128" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.iam-assign-section {
  margin-bottom: 16px;
}

.iam-assign-section__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.iam-assign-section__hint {
  margin-left: 8px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
