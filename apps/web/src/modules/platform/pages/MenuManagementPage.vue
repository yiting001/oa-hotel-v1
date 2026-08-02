<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue';
import { MENU_REGISTRY, type RoleMenuConfig } from '@oa/contracts';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { iamApi } from '../api/iam-api';
import PlatformPageHeader from '../components/PlatformPageHeader.vue';

const loading = ref(false);
const savingRoleId = ref<string | null>(null);
const roleConfigs = ref<RoleMenuConfig[]>([]);
const selectedRoleId = ref<string | null>(null);
/** roleId -> 勾选（可见）的菜单 id 集合 */
const visibleSelections = reactive(new Map<string, Set<string>>());

const menuGroups = computed(() => {
  const groups = new Map<string, { id: string; label: string; items: typeof MENU_REGISTRY }>();
  for (const item of MENU_REGISTRY) {
    const group = groups.get(item.groupId) ?? {
      id: item.groupId,
      label: item.groupLabel,
      items: [],
    };
    (group.items as (typeof MENU_REGISTRY)[number][]).push(item);
    groups.set(item.groupId, group);
  }
  return [...groups.values()];
});

const selectedRole = computed(
  () => roleConfigs.value.find((role) => role.roleId === selectedRoleId.value) ?? null,
);
const selectedVisible = computed(() =>
  selectedRoleId.value ? (visibleSelections.get(selectedRoleId.value) ?? new Set<string>()) : null,
);
const dirty = computed(() => {
  const role = selectedRole.value;
  const visible = selectedVisible.value;
  if (!role || !visible) return false;
  const savedHidden = new Set(role.hiddenMenuIds);
  return MENU_REGISTRY.some((item) => visible.has(item.id) === savedHidden.has(item.id));
});
const systemAdminSelected = computed(() => selectedRole.value?.roleCode === 'SYSTEM_ADMIN');

onMounted(() => void refresh());

async function refresh(): Promise<void> {
  loading.value = true;
  try {
    roleConfigs.value = await iamApi.listRoleMenuConfigs();
    visibleSelections.clear();
    for (const role of roleConfigs.value) {
      const hidden = new Set(role.hiddenMenuIds);
      visibleSelections.set(
        role.roleId,
        new Set(MENU_REGISTRY.filter((item) => !hidden.has(item.id)).map((item) => item.id)),
      );
    }
    if (!selectedRoleId.value || !visibleSelections.has(selectedRoleId.value)) {
      selectedRoleId.value = roleConfigs.value[0]?.roleId ?? null;
    }
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '菜单配置加载失败');
  } finally {
    loading.value = false;
  }
}

function toggleMenu(menuId: string, checked: boolean): void {
  const visible = selectedVisible.value;
  if (!visible) return;
  if (checked) visible.add(menuId);
  else visible.delete(menuId);
}

function toggleGroup(groupId: string, checked: boolean): void {
  const visible = selectedVisible.value;
  if (!visible) return;
  for (const item of MENU_REGISTRY.filter((entry) => entry.groupId === groupId)) {
    if (checked) visible.add(item.id);
    else visible.delete(item.id);
  }
}

function groupState(groupId: string): { all: boolean; some: boolean } {
  const visible = selectedVisible.value;
  const items = MENU_REGISTRY.filter((entry) => entry.groupId === groupId);
  const checkedCount = items.filter((item) => visible?.has(item.id)).length;
  return { all: checkedCount === items.length, some: checkedCount > 0 };
}

async function save(): Promise<void> {
  const role = selectedRole.value;
  const visible = selectedVisible.value;
  if (!role || !visible) return;
  const hiddenMenuIds = MENU_REGISTRY.filter((item) => !visible.has(item.id)).map(
    (item) => item.id,
  );
  savingRoleId.value = role.roleId;
  try {
    const updated = await iamApi.saveRoleHiddenMenus(role.roleId, hiddenMenuIds);
    roleConfigs.value = roleConfigs.value.map((entry) =>
      entry.roleId === updated.roleId ? updated : entry,
    );
    ElMessage.success(`角色「${role.roleName}」的菜单可见性已保存`);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '菜单配置保存失败');
  } finally {
    savingRoleId.value = null;
  }
}
</script>

<template>
  <div class="platform-page menu-management-page">
    <PlatformPageHeader
      description="按角色配置左侧导航菜单的可见性；用户拥有多个角色时，只要任一角色可见即显示。菜单最终是否可用仍受功能权限约束。"
      eyebrow="平台管理 / 菜单"
      title="菜单管理"
    >
      <template #actions>
        <el-button :icon="Refresh" :loading="loading" @click="refresh">刷新</el-button>
      </template>
    </PlatformPageHeader>

    <el-skeleton v-if="loading && roleConfigs.length === 0" animated :rows="10" />
    <div v-else class="menu-management-layout">
      <el-card class="menu-management-roles" shadow="never">
        <template #header>角色列表</template>
        <el-menu :default-active="selectedRoleId ?? ''" @select="selectedRoleId = String($event)">
          <el-menu-item v-for="role in roleConfigs" :key="role.roleId" :index="role.roleId">
            <span>{{ role.roleName }}</span>
            <el-tag v-if="!role.active" size="small" type="info">停用</el-tag>
            <el-tag v-else-if="role.hiddenMenuIds.length" size="small" type="warning">
              隐藏 {{ role.hiddenMenuIds.length }}
            </el-tag>
          </el-menu-item>
        </el-menu>
      </el-card>

      <el-card v-if="selectedRole" class="menu-management-detail" shadow="never">
        <template #header>
          <div class="menu-management-detail__header">
            <span>
              {{ selectedRole.roleName }}
              <el-tag size="small">{{ selectedRole.roleCode }}</el-tag>
            </span>
            <el-button
              :disabled="!dirty || systemAdminSelected"
              :loading="savingRoleId === selectedRole.roleId"
              type="primary"
              @click="save"
            >
              保存配置
            </el-button>
          </div>
        </template>
        <el-alert
          v-if="systemAdminSelected"
          :closable="false"
          show-icon
          title="系统管理员角色始终可见全部菜单，不可修改"
          type="info"
        />
        <section v-for="group in menuGroups" :key="group.id" class="menu-management-group">
          <el-checkbox
            :disabled="systemAdminSelected"
            :indeterminate="groupState(group.id).some && !groupState(group.id).all"
            :model-value="groupState(group.id).all"
            @change="toggleGroup(group.id, Boolean($event))"
          >
            <strong>{{ group.label }}</strong>
          </el-checkbox>
          <div class="menu-management-group__items">
            <el-checkbox
              v-for="item in group.items"
              :key="item.id"
              :disabled="systemAdminSelected"
              :model-value="selectedVisible?.has(item.id) ?? false"
              @change="toggleMenu(item.id, Boolean($event))"
            >
              {{ item.label }}
            </el-checkbox>
          </div>
        </section>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.menu-management-layout {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 16px;
  align-items: start;
}

.menu-management-roles :deep(.el-menu) {
  border-right: none;
}

.menu-management-roles :deep(.el-menu-item) {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.menu-management-detail__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.menu-management-group {
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.menu-management-group__items {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 24px;
  padding: 6px 0 0 24px;
}

@media (max-width: 767px) {
  .menu-management-layout {
    grid-template-columns: 1fr;
  }
}
</style>
