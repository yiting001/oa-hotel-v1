<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue';
import type { PortalContentSummary, PortalSection } from '@oa/contracts';
import { ElMessage } from 'element-plus';
import { computed, onMounted, ref, type CSSProperties } from 'vue';
import { useRouter } from 'vue-router';
import { brandAssets } from '../../../shared/app-config';
import { formatBusinessLongDate } from '../../../shared/business-time';
import WorkspaceMetricStrip from '../../../shared/components/WorkspaceMetricStrip.vue';
import { useSessionStore } from '../../../shared/session';
import { useLayoutMode } from '../../../ui/useLayoutMode';
import { usePersonalWorkbenchStore } from '../../workbench/store/workbench';
import PortalCalendarPanel from '../components/PortalCalendarPanel.vue';
import PortalContentDrawer from '../components/PortalContentDrawer.vue';
import PortalContentListDrawer from '../components/PortalContentListDrawer.vue';
import PortalSectionPanel from '../components/PortalSectionPanel.vue';
import { usePortalStore } from '../store/portal';
import { usePortalContentReader } from '../usePortalContentReader';

const router = useRouter();
const session = useSessionStore();
const { isCompact } = useLayoutMode();
const workbench = usePersonalWorkbenchStore();
const portal = usePortalStore();
const { drawerOpen: contentDrawerOpen, loading: contentLoading, content: selectedContent,
  openContent, setDrawerOpen: setContentDrawerOpen } = usePortalContentReader('门户内容加载失败');
const contentListDrawerOpen = ref(false);
const selectedSection = ref<PortalSection | null>(null);
const portalBannerStyle = { '--portal-banner-image': `url("${brandAssets.portalBanner}")` } as CSSProperties;
const sections = computed(() => [...(portal.home?.sections ?? [])].sort((a, b) => a.displayOrder - b.displayOrder));
const today = computed(() => formatBusinessLongDate());
const metrics = computed(() => [
  { key: '/approval', label: '待我审批', value: workbench.count('PENDING') },
  { key: '/workbench?tab=unread', label: '待阅信息', value: portal.readingTotal('UNREAD') },
  { key: '/workbench?tab=drafts', label: '我的草稿', value: workbench.count('DRAFTS') },
  { key: '/workbench?tab=mine', label: '我发起的', value: workbench.count('MINE') },
]);
function selectMetric(item: { key: string }): void { void router.push(item.key); }
onMounted(refresh);
async function refresh(): Promise<void> {
  try { await Promise.all([portal.refreshHome(), portal.refreshReading('UNREAD'), workbench.refreshSummary()]); }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '公司门户加载失败'); }
}
function openSectionList(section: PortalSection): void {
  selectedSection.value = section; contentListDrawerOpen.value = true;
}
function openListedContent(item: PortalContentSummary): void {
  contentListDrawerOpen.value = false; void openContent(item);
}
function openLink(url: string): void {
  if (url.startsWith('/') && !url.startsWith('//')) void router.push(url);
  else if (/^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener,noreferrer');
}
</script>

<template>
  <main class="ui-page portal-page" :class="{ 'portal-page--compact': isCompact }">
    <header class="portal-page-heading">
      <div><span>{{ today }} · {{ session.user?.displayName }}</span><h1>公司门户</h1></div>
      <div class="ui-actions">
        <el-button :icon="Refresh" :loading="portal.loading" @click="refresh">刷新</el-button>
        <el-button type="primary" @click="router.push('/start')">发起申请</el-button>
      </div>
    </header>
    <div class="portal-image-strip" :style="portalBannerStyle" role="img" aria-label="酒店实景" />
    <WorkspaceMetricStrip interactive label="工作摘要" :items="metrics" @select="selectMetric" />
    <el-skeleton v-if="portal.loading && !portal.home" :rows="12" animated />
    <div v-else class="portal-home-layout">
      <div class="portal-sections">
        <PortalSectionPanel v-for="section in sections" :key="section.key" :section="section" @more="openSectionList" @open="openContent" />
      </div>
      <aside class="portal-sidebar">
        <section class="portal-links-panel">
          <header class="portal-section-heading"><h2>常用链接</h2><span>{{ portal.home?.quickLinks.length ?? 0 }}</span></header>
          <div class="portal-quick-links">
            <button v-for="link in portal.home?.quickLinks ?? []" :key="link.id" type="button" @click="openLink(link.url)"><span>{{ link.title }}</span><small>{{ link.url.startsWith('/') ? '系统内' : '外部' }}</small></button>
          </div>
          <el-empty v-if="!portal.home?.quickLinks.length" description="暂无链接" :image-size="40" />
        </section>
        <PortalCalendarPanel :events="portal.home?.calendarEvents ?? []" />
      </aside>
    </div>
    <PortalContentListDrawer v-model:open="contentListDrawerOpen" :section="selectedSection" @open-content="openListedContent" />
    <PortalContentDrawer :open="contentDrawerOpen" :content="selectedContent" :loading="contentLoading" @update:open="setContentDrawerOpen" />
  </main>
</template>

<style scoped>
.portal-page-heading {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--color-border);
}
.portal-page-heading h1 { margin: 4px 0 0; font-size: 32px; font-weight: 600; }
.portal-page-heading span { color: var(--color-text-tertiary); font-size: 13px; }
.portal-image-strip {
  height: 200px;
  background-color: var(--color-surface);
  background-image: var(--portal-banner-image);
  background-position: center 46%;
  background-size: cover;
  border-radius: var(--radius-xl);
}
.portal-home-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  align-items: start;
  gap: 24px;
}
.portal-sections { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; align-items: start; }
.portal-sidebar { display: grid; gap: 24px; }
.portal-links-panel { padding: 16px; background: var(--color-surface); border-radius: var(--radius-lg); }
.portal-section-heading { display: flex; min-height: 28px; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.portal-section-heading h2 { margin: 0; font-size: 18px; font-weight: 600; }
.portal-section-heading span { color: var(--color-text-tertiary); font-size: 13px; }
.portal-quick-links { display: grid; }
.portal-quick-links button {
  display: flex;
  width: 100%;
  min-height: 40px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 2px;
  color: inherit;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  text-align: left;
}
.portal-quick-links button:hover { color: var(--color-brand-blue); }
.portal-quick-links small { color: var(--color-text-tertiary); }
.portal-page--compact .portal-image-strip { height: 132px; border-radius: var(--radius-lg); }
.portal-page--compact .portal-home-layout,
.portal-page--compact .portal-sections { grid-template-columns: minmax(0, 1fr); gap: 16px; }
.portal-page--compact .portal-page-heading h1 { font-size: 24px; }
</style>
