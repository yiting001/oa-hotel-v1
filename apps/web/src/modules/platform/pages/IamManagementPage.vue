<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue';
import { ElAlert, ElButton, ElIcon, ElTabPane, ElTabs } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import WorkspaceMetricStrip, {
  type MetricItem,
} from '../../../shared/components/WorkspaceMetricStrip.vue';
import { useSessionStore } from '../../../shared/session';
import { iamApi } from '../api/iam-api';
import DepartmentTreePanel from '../components/iam/DepartmentTreePanel.vue';
import RolePermissionPanel from '../components/iam/RolePermissionPanel.vue';
import UserAuthorizationPanel from '../components/iam/UserAuthorizationPanel.vue';
import type { DepartmentNode, IamUser, Permission, Position, RoleSummary } from '../types/iam';

const session = useSessionStore();
const canManage = computed(() => session.can('IAM_MANAGE'));
const departments = ref<DepartmentNode[]>([]);
const positions = ref<Position[]>([]);
const roles = ref<RoleSummary[]>([]);
const permissions = ref<Permission[]>([]);
const users = ref<IamUser[]>([]);
const loading = ref(false);
const error = ref('');
const activeTab = ref('organization');
const metrics = computed<MetricItem[]>(() => [
  { key: 'departments', label: '一级组织', value: departments.value.length },
  { key: 'users', label: '用户', value: users.value.length },
  { key: 'roles', label: '角色', value: roles.value.length },
  { key: 'permissions', label: '权限', value: permissions.value.length },
]);

onMounted(() => void refresh());

async function refresh(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    [departments.value, positions.value, roles.value, permissions.value, users.value] =
      await Promise.all([
        iamApi.listDepartments(),
        iamApi.listPositions(),
        iamApi.listRoles(),
        iamApi.listPermissions(),
        iamApi.listUsers(),
      ]);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '组织权限数据加载失败';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="iam-management-page ui-page">
    <AppPageHeader
      description="统一维护多层级部门、多岗位任职、业务角色、功能权限和数据范围。"
      eyebrow="系统设置"
      title="组织与权限中心"
    >
      <template #actions>
        <div class="ui-actions">
          <ElButton :loading="loading" @click="refresh">
            <ElIcon><Refresh /></ElIcon>
            刷新
          </ElButton>
        </div>
      </template>
    </AppPageHeader>

    <ElAlert v-if="error" :closable="false" show-icon :title="error" type="error" />
    <ElAlert
      v-else-if="!canManage"
      :closable="false"
      show-icon
      title="当前账号仅可查看组织与权限配置，所有编辑操作已关闭"
      type="info"
    />

    <WorkspaceMetricStrip label="组织与权限概览" :items="metrics" />

    <ElTabs v-model="activeTab">
      <ElTabPane label="部门与岗位" name="organization">
        <DepartmentTreePanel
          :departments="departments"
          :loading="loading"
          :positions="positions"
          :readonly="!canManage"
          :users="users"
          @refresh="refresh"
        />
      </ElTabPane>
      <ElTabPane label="用户授权" name="users">
        <UserAuthorizationPanel
          :departments="departments"
          :loading="loading"
          :positions="positions"
          :roles="roles"
          :readonly="!canManage"
          :users="users"
          @refresh="refresh"
        />
      </ElTabPane>
      <ElTabPane label="角色权限" name="roles">
        <RolePermissionPanel
          :loading="loading"
          :permissions="permissions"
          :readonly="!canManage"
          :roles="roles"
          @refresh="refresh"
        />
      </ElTabPane>
    </ElTabs>
  </div>
</template>

<style scoped>
.iam-management-page {
  min-width: 0;
}
.iam-management-page :deep(.el-tabs__content) {
  padding-top: 24px;
}
</style>
