import { createRouter, createWebHistory, type RouteMeta, type RouteRecordRaw } from 'vue-router';
import { contractRoutes } from '../modules/contract/routes';
import {
  accountSecurityRouteName,
  forcedPasswordChangeRedirect,
} from '../modules/account/account-security.policy';
import { accountRoutes } from '../modules/account/routes';
import { portalRoutes } from '../modules/portal/routes';
import { platformRoutes } from '../modules/platform/routes';
import { sealRoutes } from '../modules/seal/routes';
import { supplyRoutes } from '../modules/supply/routes';
import { workbenchRoutes } from '../modules/workbench/routes';
import { businessDocumentRoutePermissions } from '../shared/business-route-permissions';
import { useSessionStore } from '../shared/session';

function toPermissionCodes(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.length > 0 ? [value] : [];
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (permissionCode): permissionCode is string =>
      typeof permissionCode === 'string' && permissionCode.length > 0,
  );
}

function getRequiredPermissions(meta: RouteMeta, documentType?: unknown): string[] {
  const requiredPermissions = toPermissionCodes(meta.requiredPermissions);
  const configured =
    requiredPermissions.length > 0
      ? requiredPermissions
      : toPermissionCodes(meta.requiredPermission);
  const dynamic = businessDocumentRoutePermissions(meta.businessDocumentPermission, documentType);
  return [...new Set([...configured, ...dynamic])];
}

function normalizePermissionMeta(route: RouteRecordRaw): RouteRecordRaw {
  return {
    ...route,
    meta: {
      ...route.meta,
      requiredPermissions: getRequiredPermissions(route.meta ?? {}),
    },
  };
}

const registeredPlatformRoutes = platformRoutes.map(normalizePermissionMeta);

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('./LoginPage.vue'),
      meta: { title: '登录', publicRoute: true },
    },
    ...accountRoutes,
    ...portalRoutes,
    ...workbenchRoutes,
    ...contractRoutes,
    ...sealRoutes,
    ...supplyRoutes,
    ...registeredPlatformRoutes,
    {
      path: '/documents/:documentType/:id/print',
      name: 'business-document-print',
      component: () => import('../modules/document-print/BusinessDocumentPrintPage.vue'),
      meta: { title: 'A4 打印', businessDocumentPermission: 'VIEW' },
    },
    {
      path: '/documents/:documentType/:id',
      name: 'document-detail',
      component: () => import('./DocumentDetailPage.vue'),
      meta: { title: '单据详情', businessDocumentPermission: 'VIEW' },
    },
    {
      path: '/403',
      name: 'forbidden',
      component: () => import('./ForbiddenPage.vue'),
      meta: { title: '无权访问' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('./NotFoundPage.vue'),
      meta: { title: '页面不存在' },
    },
  ],
});

router.beforeEach(async (to) => {
  const session = useSessionStore();
  await session.ensureSession();
  if (to.meta.publicRoute === true) {
    if (!session.authenticated || to.name !== 'login') return true;
    return session.user?.passwordChangeRequired
      ? { name: accountSecurityRouteName }
      : { name: 'personal-workbench' };
  }
  if (!session.authenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  const passwordChangeRedirect = forcedPasswordChangeRedirect(
    session.user?.passwordChangeRequired === true,
    to.name,
  );
  if (passwordChangeRedirect) return passwordChangeRedirect;

  const requiredPermissions = getRequiredPermissions(to.meta, to.params.documentType);
  if (!requiredPermissions.every((permissionCode) => session.can(permissionCode))) {
    return {
      name: 'forbidden',
      query: { from: to.fullPath },
      replace: true,
    };
  }
  return true;
});
