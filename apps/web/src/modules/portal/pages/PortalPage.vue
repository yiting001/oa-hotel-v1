<script setup lang="ts">
import { Box, DocumentAdd, Refresh, ShoppingCart, Tickets } from '@element-plus/icons-vue';
import type { DocumentType, PortalContentSummary, PortalSection } from '@oa/contracts';
import { ElMessage } from 'element-plus';
import { computed, onMounted, ref, type Component, type CSSProperties } from 'vue';
import { useRouter } from 'vue-router';
import { businessHour, formatBusinessLongDate } from '../../../shared/business-time';
import { appConfig, brandAssets } from '../../../shared/app-config';
import { useSessionStore } from '../../../shared/session';
import { availableProcessStarts } from '../../../shared/process-start';
import { usePersonalWorkbenchStore } from '../../workbench/store/workbench';
import PortalCalendarPanel from '../components/PortalCalendarPanel.vue';
import PortalContentDrawer from '../components/PortalContentDrawer.vue';
import PortalContentListDrawer from '../components/PortalContentListDrawer.vue';
import PortalSectionPanel from '../components/PortalSectionPanel.vue';
import { usePortalStore } from '../store/portal';
import { usePortalContentReader } from '../usePortalContentReader';

const router = useRouter();
const session = useSessionStore();
const workbench = usePersonalWorkbenchStore();
const portal = usePortalStore();
const {
  drawerOpen: contentDrawerOpen,
  loading: contentLoading,
  content: selectedContent,
  openContent,
  setDrawerOpen: setContentDrawerOpen,
} = usePortalContentReader('门户内容加载失败');
const contentListDrawerOpen = ref(false);
const selectedSection = ref<PortalSection | null>(null);
const portalBannerStyle = {
  '--portal-banner-image': `url("${brandAssets.portalBanner}")`,
} as CSSProperties;

const quickStarts = computed(() => availableProcessStarts(session.user?.permissionCodes ?? []));
const sections = computed(() =>
  [...(portal.home?.sections ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
);
const featuredSections = computed(() => sections.value.filter(isFeaturedSection));
const regularSections = computed(() =>
  sections.value
    .filter((section) => !isFeaturedSection(section))
    .map((section, order) => ({ order, section })),
);
const sectionColumns = computed(() => [
  regularSections.value.filter(({ order }) => order % 2 === 0),
  regularSections.value.filter(({ order }) => order % 2 === 1),
]);
const today = computed(() => formatBusinessLongDate());
const greeting = computed(() => {
  const hour = businessHour();
  return hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
});
const quickStartIcons: Record<DocumentType, Component> = {
  CONTRACT_REQUEST: DocumentAdd,
  CONTRACT_APPROVAL: Tickets,
  CONTRACT_PAYMENT: Tickets,
  SEAL_BORROW: Box,
  SEAL_USE: Box,
  MATERIAL_PURCHASE: ShoppingCart,
  MATERIAL_REQUISITION: Box,
  PURCHASE_APPROVAL: ShoppingCart,
  PETTY_PROCUREMENT: Box,
};

onMounted(refresh);

async function refresh(): Promise<void> {
  try {
    await Promise.all([
      portal.refreshHome(),
      portal.refreshReading('UNREAD'),
      workbench.refreshSummary(),
    ]);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '公司门户加载失败');
  }
}

function openSectionList(section: PortalSection): void {
  selectedSection.value = section;
  contentListDrawerOpen.value = true;
}

function openListedContent(item: PortalContentSummary): void {
  contentListDrawerOpen.value = false;
  void openContent(item);
}

function isFeaturedSection(section: PortalSection): boolean {
  return section.key === 'COMPANY_NEWS';
}

function openLink(url: string): void {
  if (url.startsWith('/')) void router.push(url);
  else window.open(url, '_blank', 'noopener,noreferrer');
}
</script>

<template>
  <main class="portal-page">
    <section class="portal-banner" :style="portalBannerStyle">
      <div class="portal-banner__content">
        <span>{{ today }}</span>
        <h1>{{ appConfig.companyName }}公司门户</h1>
        <p>
          {{ greeting }}，{{
            session.user?.displayName
          }}。这里汇总公司信息、审批任务与常用办公入口。
        </p>
      </div>
      <el-button :icon="Refresh" plain @click="refresh">刷新</el-button>
    </section>

    <el-skeleton v-if="portal.loading && !portal.home" :rows="14" animated />
    <template v-else>
      <section class="portal-operation-band">
        <div class="portal-metrics" aria-label="工作摘要">
          <button type="button" @click="router.push('/workbench?tab=pending')">
            <span>待我审批</span><strong>{{ workbench.count('PENDING') }}</strong
            ><small>进入任务队列</small>
          </button>
          <button type="button" @click="router.push('/workbench?tab=unread')">
            <span>待阅信息</span><strong>{{ portal.readingTotal('UNREAD') }}</strong
            ><small>需要及时查看</small>
          </button>
          <button type="button" @click="router.push('/workbench?tab=drafts')">
            <span>我的草稿</span><strong>{{ workbench.count('DRAFTS') }}</strong
            ><small>继续完善单据</small>
          </button>
          <button type="button" @click="router.push('/workbench?tab=mine')">
            <span>我发起的</span><strong>{{ workbench.count('MINE') }}</strong
            ><small>跟踪办理进度</small>
          </button>
        </div>
        <div class="portal-quick-starts">
          <header class="portal-section-heading">
            <strong>快捷发起</strong><span>按当前权限展示</span>
          </header>
          <div>
            <button
              v-for="item in quickStarts"
              :key="item.documentType"
              type="button"
              @click="router.push(item.path)"
            >
              <el-icon><component :is="quickStartIcons[item.documentType]" /></el-icon>
              <span
                ><strong>{{ item.label }}</strong
                ><small>{{ item.moduleLabel }}</small></span
              >
            </button>
            <el-empty
              v-if="quickStarts.length === 0"
              description="暂无可发起流程"
              :image-size="48"
            />
          </div>
        </div>
      </section>

      <section class="portal-information-layout">
        <div class="portal-information-main">
          <PortalSectionPanel
            v-for="section in featuredSections"
            :key="section.key"
            :section="section"
            @more="openSectionList"
            @open="openContent"
          />
          <div v-if="regularSections.length" class="portal-section-columns">
            <div
              v-for="(column, columnIndex) in sectionColumns"
              :key="columnIndex"
              class="portal-section-column"
            >
              <PortalSectionPanel
                v-for="entry in column"
                :key="entry.section.key"
                :section="entry.section"
                :style="{ order: entry.order }"
                @more="openSectionList"
                @open="openContent"
              />
            </div>
          </div>
        </div>
        <aside class="portal-information-aside">
          <PortalCalendarPanel :events="portal.home?.calendarEvents ?? []" />
          <section class="portal-links-panel">
            <header class="portal-section-heading">
              <strong>常用链接</strong><span>{{ portal.home?.quickLinks.length ?? 0 }} 项</span>
            </header>
            <button
              v-for="link in portal.home?.quickLinks ?? []"
              :key="link.id"
              type="button"
              @click="openLink(link.url)"
            >
              <span>{{ link.title }}</span
              ><small>{{ link.url.startsWith('/') ? '系统内' : '外部' }}</small>
            </button>
          </section>
        </aside>
      </section>
    </template>

    <PortalContentListDrawer
      v-model:open="contentListDrawerOpen"
      :section="selectedSection"
      @open-content="openListedContent"
    />
    <PortalContentDrawer
      :open="contentDrawerOpen"
      :content="selectedContent"
      :loading="contentLoading"
      @update:open="setContentDrawerOpen"
    />
  </main>
</template>
