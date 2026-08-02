import type { PortalContentDetail, PortalContentSummary } from '@oa/contracts';
import { ElMessage } from 'element-plus';
import { ref } from 'vue';
import { getAuthGeneration } from '../../shared/api';
import { useSessionStore } from '../../shared/session';
import { usePortalStore } from './store/portal';

export function usePortalContentReader(fallbackMessage = '门户内容加载失败') {
  const session = useSessionStore();
  const portal = usePortalStore();
  const drawerOpen = ref(false);
  const loading = ref(false);
  const content = ref<PortalContentDetail | null>(null);
  let requestSequence = 0;
  let selectedContentId: string | null = null;

  async function openContent(item: PortalContentSummary): Promise<void> {
    const sequence = ++requestSequence;
    const generation = getAuthGeneration();
    const userId = session.user?.id;
    selectedContentId = item.id;
    drawerOpen.value = true;
    loading.value = true;
    content.value = null;
    try {
      const detail = await portal.getContent(item.id);
      if (!isCurrent(sequence, item.id, generation, userId)) return;
      content.value = detail;
      if (!item.read) {
        if (!isCurrent(sequence, item.id, generation, userId)) return;
        const refreshed = await portal.markRead(item);
        if (!isCurrent(sequence, item.id, generation, userId)) return;
        content.value = { ...detail, read: true };
        if (!refreshed) ElMessage.warning('阅读状态已保存，列表刷新失败');
      }
    } catch (error) {
      if (isCurrent(sequence, item.id, generation, userId)) {
        setDrawerOpen(false);
        ElMessage.error(error instanceof Error ? error.message : fallbackMessage);
      }
    } finally {
      if (isCurrent(sequence, item.id, generation, userId)) loading.value = false;
    }
  }

  function setDrawerOpen(value: boolean): void {
    drawerOpen.value = value;
    if (value) return;
    requestSequence += 1;
    selectedContentId = null;
    content.value = null;
    loading.value = false;
  }

  function isCurrent(
    sequence: number,
    contentId: string,
    generation: number,
    userId: string | undefined,
  ): boolean {
    return (
      sequence === requestSequence &&
      drawerOpen.value &&
      selectedContentId === contentId &&
      generation === getAuthGeneration() &&
      session.user?.id === userId
    );
  }

  return { drawerOpen, loading, content, openContent, setDrawerOpen };
}
