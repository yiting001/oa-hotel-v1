<script setup lang="ts">
import { Connection, Key, OfficeBuilding, Refresh, User } from '@element-plus/icons-vue';
import { ElAlert, ElButton, ElIcon, ElTabPane, ElTabs } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
import { useSessionStore } from '../../../shared/session';
import { iamApi } from '../api/iam-api';
import DepartmentTreePanel from '../components/iam/DepartmentTreePanel.vue';
import RolePermissionPanel from '../components/iam/RolePermissionPanel.vue';
import UserAuthorizationPanel from '../components/iam/UserAuthorizationPanel.vue';
import PlatformPageHeader from '../components/PlatformPageHeader.vue';
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
  <div class="platform-page iam-page">
    <PlatformPageHeader
      eyebrow="平台管理 / IAM"
      title="组织与权限中心"
      description="统一维护多层级部门、多岗位任职、业务角色、功能权限和数据范围。"
    >
      <template #actions>
        <ElButton :loading="loading" @click="refresh"
          ><ElIcon><Refresh /></ElIcon>刷新</ElButton
        >
      </template>
    </PlatformPageHeader>
    <ElAlert v-if="error" :closable="false" show-icon :title="error" type="error" />
    <ElAlert
      v-else-if="!canManage"
      :closable="false"
      show-icon
      title="当前账号仅可查看组织与权限配置，所有编辑操作已关闭"
      type="info"
    />
    <div class="platform-context-strip">
      <span
        ><ElIcon><OfficeBuilding /></ElIcon
        ><strong>{{ departments.length }}</strong> 个一级组织</span
      >
      <span
        ><ElIcon><User /></ElIcon><strong>{{ users.length }}</strong> 名用户</span
      >
      <span
        ><ElIcon><Connection /></ElIcon><strong>{{ roles.length }}</strong> 个角色</span
      >
      <span
        ><ElIcon><Key /></ElIcon><strong>{{ permissions.length }}</strong> 项权限</span
      >
    </div>
    <ElTabs v-model="activeTab" class="platform-tabs">
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
