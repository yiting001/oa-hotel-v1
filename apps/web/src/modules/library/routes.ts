import type { RouteRecordRaw } from 'vue-router';

export const libraryRoutes: RouteRecordRaw[] = [
  {
    path: '/documents',
    name: 'library-documents',
    component: () => import('./pages/LibraryPage.vue'),
    meta: { title: '公司文件制度', requiredPermissions: ['LIBRARY_VIEW'] },
  },
];
