<script setup lang="ts">
import { Star, StarFilled } from '@element-plus/icons-vue';
import type { DocumentFollowState } from '@oa/contracts';
import { ElMessage } from 'element-plus';
import { ref, watch } from 'vue';
import { followDocument, loadDocumentFollowState, unfollowDocument } from '../api/workbench-api';

const props = defineProps<{ documentId: string; compact?: boolean }>();
const emit = defineEmits<{ changed: [state: DocumentFollowState] }>();
const state = ref<DocumentFollowState | null>(null);
const loading = ref(false);

watch(
  () => props.documentId,
  () => void load(),
  { immediate: true },
);

async function load(): Promise<void> {
  loading.value = true;
  try {
    state.value = await loadDocumentFollowState(props.documentId);
  } catch (error) {
    ElMessage.warning(error instanceof Error ? error.message : '关注状态加载失败');
  } finally {
    loading.value = false;
  }
}

async function toggle(): Promise<void> {
  loading.value = true;
  try {
    state.value = state.value?.following
      ? await unfollowDocument(props.documentId)
      : await followDocument(props.documentId);
    emit('changed', state.value);
    ElMessage.success(state.value.following ? '已关注单据' : '已取消关注');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '关注操作失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <el-button
    :aria-label="state?.following ? '取消关注单据' : '关注单据'"
    data-testid="document-follow-toggle"
    :icon="state?.following ? StarFilled : Star"
    :link="compact"
    :loading="loading"
    :type="state?.following ? 'warning' : 'default'"
    @click="toggle"
  >
    {{ state?.following ? '已关注' : '关注' }}
  </el-button>
</template>
