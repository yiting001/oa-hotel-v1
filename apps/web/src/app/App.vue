<script setup lang="ts">
import { ArrowLeft, ArrowRight, Close, Lock, Menu, SwitchButton, User } from '@element-plus/icons-vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { unauthorizedEventName } from '../shared/api';
import { appConfig, companyMark } from '../shared/app-config';
import { useDirectoryStore } from '../shared/directory';
import { availableProcessStarts } from '../shared/process-start';
import { useSessionStore } from '../shared/session';
import { usePortalStore } from '../modules/portal/store/portal';
import { usePersonalWorkbenchStore } from '../modules/workbench/store/workbench';
import { useWorkflowStore } from '../shared/workflow';
import AppNavigationMenu from './AppNavigationMenu.vue';
import MobileBottomNavigation from './MobileBottomNavigation.vue';
import { mobilePrimaryNavigation, navigationGroupsFromMenuTree, selectedNavigationPath, visibleNavigationGroups } from './navigation';
import { initializeLayoutMode, useLayoutMode } from '../ui/useLayoutMode';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const directory = useDirectoryStore();
const portal = usePortalStore();
const workbench = usePersonalWorkbenchStore();
const workflow = useWorkflowStore();
const mobileMenuOpen = ref(false);
const siderCollapsed = ref(false);
let handlingUnauthorized = false;
let stopLayout: (() => void) | undefined;

onMounted(() => {
  window.addEventListener(unauthorizedEventName, handleUnauthorized);
  stopLayout = initializeLayoutMode();
});
onBeforeUnmount(() => {
  window.removeEventListener(unauthorizedEventName, handleUnauthorized);
  stopLayout?.();
});

const { isCompact } = useLayoutMode();
const publicRoute = computed(() => route.meta.publicRoute === true);
const pageTitle = computed(() => route.path === '/workbench' && route.query.tab === 'pending' ? '审批中心' : String(route.meta.title ?? '工作台'));
const quickStarts = computed(() => availableProcessStarts(session.user?.permissionCodes ?? []));
const navigationGroups = computed(() => session.menuTreeLoaded ? navigationGroupsFromMenuTree(session.menuTree, session.user?.permissionCodes ?? [], quickStarts.value.length) : visibleNavigationGroups(session.user?.permissionCodes ?? [], quickStarts.value.length));
const selectedPath = computed(() => selectedNavigationPath(navigationGroups.value, route.path));
const activeGroupLabel = computed(() => navigationGroups.value.find((group) => group.items.some((item) => item.path.split('?')[0] === selectedPath.value))?.label ?? appConfig.productName);
const mobileNavigationItems = computed(() => mobilePrimaryNavigation(navigationGroups.value));
const passwordChangeRequired = computed(() => session.user?.passwordChangeRequired === true);

function navigate(path: string): void { mobileMenuOpen.value = false; void router.push(path); }
function handleUserCommand(command: string): void { if (command === 'security') void router.push('/account/security'); else if (command === 'logout') signOut(); }
function signOut(): void { resetUserState(); void router.replace('/login'); }
function resetUserState(): void { directory.$reset(); portal.$reset(); workbench.$reset(); workflow.$reset(); session.signOut(); }
function handleUnauthorized(): void {
  if (handlingUnauthorized || (!session.authenticated && route.name === 'login')) return;
  handlingUnauthorized = true;
  const redirect = route.meta.publicRoute === true ? undefined : route.fullPath;
  resetUserState();
  void router.replace({ name: 'login', query: redirect ? { redirect } : {} }).finally(() => (handlingUnauthorized = false));
}
</script>

<template>
  <RouterView v-if="publicRoute" />
  <el-container v-else class="ui-shell">
    <el-aside v-if="!passwordChangeRequired && !isCompact" :width="siderCollapsed ? '72px' : '224px'" class="ui-sidebar">
      <div class="ui-brand" :class="{ 'ui-brand--collapsed': siderCollapsed }">
        <span class="ui-brand__mark">{{ companyMark }}</span>
        <span v-if="!siderCollapsed" class="ui-brand__copy"><strong>{{ appConfig.companyName }} OA</strong><small>{{ appConfig.productName }}</small></span>
      </div>
      <el-scrollbar class="ui-sidebar__scroll"><AppNavigationMenu :active-path="selectedPath" :collapsed="siderCollapsed" :groups="navigationGroups" @navigate="navigate" /></el-scrollbar>
      <button class="ui-sidebar__collapse" type="button" :aria-label="siderCollapsed ? '展开导航' : '收起导航'" @click="siderCollapsed = !siderCollapsed"><el-icon><ArrowRight v-if="siderCollapsed" /><ArrowLeft v-else /></el-icon><span v-if="!siderCollapsed">收起导航</span></button>
    </el-aside>

    <el-drawer v-if="!passwordChangeRequired && isCompact" v-model="mobileMenuOpen" class="ui-menu-drawer" direction="ltr" :show-close="false" size="min(92vw, 360px)" :with-header="false">
      <div class="ui-menu-drawer__head"><div class="ui-brand"><span class="ui-brand__mark">{{ companyMark }}</span><span class="ui-brand__copy"><strong>{{ appConfig.companyName }} OA</strong><small>{{ appConfig.productName }}</small></span></div><el-button :icon="Close" circle text aria-label="关闭导航" @click="mobileMenuOpen = false" /></div>
      <AppNavigationMenu :active-path="selectedPath" :groups="navigationGroups" @navigate="navigate" />
    </el-drawer>

    <el-container class="ui-app-body">
      <el-header class="ui-app-header">
        <el-button v-if="!passwordChangeRequired && isCompact" class="ui-menu-trigger" :icon="Menu" circle text aria-label="打开导航" @click="mobileMenuOpen = true" />
        <div class="ui-breadcrumb"><span>{{ activeGroupLabel }}</span><i>/</i><strong>{{ pageTitle }}</strong></div>
        <div class="ui-spacer" />
        <el-dropdown placement="bottom-end" trigger="click" @command="handleUserCommand">
          <button class="ui-user" type="button"><el-avatar :icon="User" :size="32" /><span><strong>{{ session.user?.displayName }}</strong><small>{{ session.user?.departmentName }}</small></span></button>
          <template #dropdown><el-dropdown-menu><el-dropdown-item command="security" :icon="Lock">修改密码</el-dropdown-item><el-dropdown-item command="logout" divided :icon="SwitchButton">退出登录</el-dropdown-item></el-dropdown-menu></template>
        </el-dropdown>
      </el-header>
      <el-main class="ui-main"><div class="ui-main__inner"><RouterView /></div></el-main>
    </el-container>
    <MobileBottomNavigation v-if="!passwordChangeRequired && isCompact" :active-path="selectedPath" :items="mobileNavigationItems" @more="mobileMenuOpen = true" @navigate="navigate" />
  </el-container>
</template>
