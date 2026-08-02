<script setup lang="ts">
import {
  ArrowLeftBold,
  ArrowRightBold,
  Close,
  EditPen,
  Lock,
  Menu,
  SwitchButton,
  User,
} from '@element-plus/icons-vue';
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterView, useRoute, useRouter } from 'vue-router';
import { unauthorizedEventName } from '../shared/api';
import { antDesignTheme, appConfig, companyMark } from '../shared/app-config';
import { useDirectoryStore } from '../shared/directory';
import { availableProcessStarts } from '../shared/process-start';
import { useSessionStore } from '../shared/session';
import { usePortalStore } from '../modules/portal/store/portal';
import { usePersonalWorkbenchStore } from '../modules/workbench/store/workbench';
import { useWorkflowStore } from '../shared/workflow';
import AppNavigationMenu from './AppNavigationMenu.vue';
import MobileBottomNavigation from './MobileBottomNavigation.vue';
import {
  mobilePrimaryNavigation,
  navigationGroupsFromMenuTree,
  selectedNavigationPath,
  visibleNavigationGroups,
} from './navigation';

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

onMounted(() => window.addEventListener(unauthorizedEventName, handleUnauthorized));
onBeforeUnmount(() => window.removeEventListener(unauthorizedEventName, handleUnauthorized));

const publicRoute = computed(() => route.meta.publicRoute === true);
const pageTitle = computed(() =>
  route.path === '/workbench' && route.query.tab === 'pending'
    ? '审批中心'
    : String(route.meta.title ?? '工作台'),
);
const quickStarts = computed(() => availableProcessStarts(session.user?.permissionCodes ?? []));
const navigationGroups = computed(() =>
  session.menuTreeLoaded
    ? navigationGroupsFromMenuTree(
        session.menuTree,
        session.user?.permissionCodes ?? [],
        quickStarts.value.length,
      )
    : visibleNavigationGroups(session.user?.permissionCodes ?? [], quickStarts.value.length),
);
const selectedPath = computed(() => selectedNavigationPath(navigationGroups.value, route.path));
const mobileNavigationItems = computed(() => mobilePrimaryNavigation(navigationGroups.value));
const siderWidth = computed(() => (siderCollapsed.value ? '72px' : '236px'));
const passwordChangeRequired = computed(() => session.user?.passwordChangeRequired === true);

function navigate(path: string): void {
  mobileMenuOpen.value = false;
  void router.push(path);
}

function handleUserCommand(command: string): void {
  if (command === 'security') {
    void router.push('/account/security');
  } else if (command === 'logout') {
    signOut();
  }
}

function signOut(): void {
  resetUserState();
  void router.replace('/login');
}

function resetUserState(): void {
  directory.$reset();
  portal.$reset();
  workbench.$reset();
  workflow.$reset();
  session.signOut();
}

function handleUnauthorized(): void {
  if (handlingUnauthorized || (!session.authenticated && route.name === 'login')) return;
  handlingUnauthorized = true;
  const redirect = route.meta.publicRoute === true ? undefined : route.fullPath;
  resetUserState();
  void router
    .replace({ name: 'login', query: redirect ? { redirect } : {} })
    .finally(() => (handlingUnauthorized = false));
}
</script>

<template>
  <a-config-provider :locale="zhCN" :theme="antDesignTheme">
    <RouterView v-if="publicRoute" />

    <el-container v-else class="enterprise-shell">
      <el-aside
        v-if="!passwordChangeRequired"
        :width="siderWidth"
        class="enterprise-sider desktop-navigation"
      >
        <div class="brand-lockup" :class="{ 'brand-lockup--collapsed': siderCollapsed }">
          <span class="brand-lockup__mark">{{ companyMark }}</span>
          <span v-if="!siderCollapsed" class="brand-lockup__copy">
            <strong>{{ appConfig.companyName }} OA</strong>
            <small>{{ appConfig.productName }}</small>
          </span>
        </div>
        <el-scrollbar class="enterprise-sider__scroll">
          <AppNavigationMenu
            :active-path="selectedPath"
            :collapsed="siderCollapsed"
            :groups="navigationGroups"
            @navigate="navigate"
          />
        </el-scrollbar>
        <button
          :aria-label="siderCollapsed ? '展开导航' : '收起导航'"
          class="enterprise-sider__collapse"
          type="button"
          @click="siderCollapsed = !siderCollapsed"
        >
          <el-icon><ArrowRightBold v-if="siderCollapsed" /><ArrowLeftBold v-else /></el-icon>
          <span v-if="!siderCollapsed">收起导航</span>
        </button>
      </el-aside>

      <el-drawer
        v-if="!passwordChangeRequired"
        v-model="mobileMenuOpen"
        append-to-body
        class="app-mobile-drawer"
        direction="ltr"
        :show-close="false"
        size="min(86vw, 320px)"
        :with-header="false"
      >
        <div class="app-mobile-drawer__header">
          <div class="brand-lockup brand-lockup--drawer">
            <span class="brand-lockup__mark">{{ companyMark }}</span>
            <span class="brand-lockup__copy">
              <strong>{{ appConfig.companyName }} OA</strong>
              <small>{{ appConfig.productName }}</small>
            </span>
          </div>
          <el-button
            aria-label="关闭导航"
            :icon="Close"
            circle
            text
            @click="mobileMenuOpen = false"
          />
        </div>
        <AppNavigationMenu
          :active-path="selectedPath"
          :groups="navigationGroups"
          @navigate="navigate"
        />
      </el-drawer>

      <el-container class="enterprise-main">
        <el-header class="enterprise-header">
          <el-button
            v-if="!passwordChangeRequired"
            aria-label="打开导航"
            class="mobile-menu-button mobile-navigation"
            :icon="Menu"
            circle
            text
            @click="mobileMenuOpen = true"
          />
          <div class="enterprise-header__title">
            <small>{{ appConfig.companyName }} OA</small>
            <strong>{{ pageTitle }}</strong>
          </div>
          <div class="enterprise-header__spacer" />
          <el-button
            v-if="quickStarts.length && !passwordChangeRequired"
            class="enterprise-header__start desktop-header-action"
            :icon="EditPen"
            type="primary"
            @click="navigate('/start')"
          >
            发起申请
          </el-button>
          <el-dropdown placement="bottom-end" trigger="click" @command="handleUserCommand">
            <button class="user-menu-trigger" type="button">
              <el-avatar :icon="User" :size="32" />
              <span class="user-menu-trigger__copy">
                <strong>{{ session.user?.displayName }}</strong>
                <small>{{ session.user?.departmentName }}</small>
              </span>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="security" :icon="Lock">修改密码</el-dropdown-item>
                <el-dropdown-item command="logout" divided :icon="SwitchButton"
                  >退出登录</el-dropdown-item
                >
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </el-header>

        <el-main class="enterprise-content">
          <div class="enterprise-content__inner"><RouterView /></div>
        </el-main>
      </el-container>

      <MobileBottomNavigation
        v-if="!passwordChangeRequired"
        :active-path="selectedPath"
        :items="mobileNavigationItems"
        @more="mobileMenuOpen = true"
        @navigate="navigate"
      />
    </el-container>
  </a-config-provider>
</template>
