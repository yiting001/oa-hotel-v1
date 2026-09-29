<script setup lang="ts">
import { Delete, Download, Plus, Search, Upload, View } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { apiRequest } from '../../../shared/api';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import WorkspaceFilterBar from '../../../shared/components/WorkspaceFilterBar.vue';
import { formatDateTime } from '../../../shared/format';
import { useSessionStore } from '../../../shared/session';
import UiDataList, { type DataColumn } from '../../../ui/UiDataList.vue';
import UiDialog from '../../../ui/UiDialog.vue';
import UiPagination from '../../../ui/UiPagination.vue';
import {
  downloadLibraryDocument,
  listLibraryDocuments,
  previewLibraryDocument,
  removeLibraryDocument,
  uploadLibraryDocument,
} from '../api/library-api';
import {
  LIBRARY_CATEGORIES,
  libraryCategoryLabels,
  type LibraryCategory,
  type LibraryDocument,
} from '../library.types';

const session = useSessionStore();
const loading = ref(false);
const saving = ref(false);
const items = ref<LibraryDocument[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const keyword = ref('');
const category = ref<LibraryCategory | ''>('');
const uploadOpen = ref(false);
const selectedFileName = ref('');
const pendingFile = ref<File | null>(null);
const uploadForm = reactive<{ title: string; category: LibraryCategory; description: string }>({
  title: '',
  category: 'REGULATION',
  description: '',
});

const canManage = computed(() => session.can('LIBRARY_MANAGE'));
const columns: DataColumn[] = [
  { key: 'title', label: '文件名称', minWidth: 260 },
  { key: 'category', label: '分类', width: 130 },
  { key: 'sizeBytes', label: '大小', width: 110 },
  { key: 'uploaderName', label: '上传人', width: 140 },
  { key: 'downloadCount', label: '下载', width: 88 },
  { key: 'updatedAt', label: '更新时间', width: 170 },
  { key: 'actions', label: '操作', width: 210 },
];

async function refresh(): Promise<void> {
  loading.value = true;
  try {
    const response = await listLibraryDocuments({
      category: category.value || undefined,
      keyword: keyword.value,
      page: page.value,
      pageSize: pageSize.value,
    });
    items.value = response.items;
    total.value = response.total;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '文件库加载失败');
  } finally {
    loading.value = false;
  }
}

watch([keyword, category], () => {
  page.value = 1;
  void refresh();
});

function changePage(next: { page: number; pageSize: number }): void {
  page.value = next.page;
  pageSize.value = next.pageSize;
  void refresh();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isPreviewable(item: LibraryDocument): boolean {
  return item.mimeType.startsWith('image/') || item.mimeType === 'application/pdf';
}

function openUpload(): void {
  uploadForm.title = '';
  uploadForm.category = 'REGULATION';
  uploadForm.description = '';
  selectedFileName.value = '';
  pendingFile.value = null;
  uploadOpen.value = true;
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  pendingFile.value = file;
  selectedFileName.value = file?.name ?? '';
  if (file && !uploadForm.title.trim()) {
    uploadForm.title = file.name.replace(/\.[^.]+$/, '');
  }
}

async function submitUpload(): Promise<void> {
  if (!pendingFile.value) {
    ElMessage.warning('请选择要上传的文件');
    return;
  }
  if (!uploadForm.title.trim()) {
    ElMessage.warning('请填写文件标题');
    return;
  }
  saving.value = true;
  try {
    await uploadLibraryDocument({
      title: uploadForm.title.trim(),
      category: uploadForm.category,
      description: uploadForm.description.trim(),
      file: pendingFile.value,
    });
    ElMessage.success('文件已上传');
    uploadOpen.value = false;
    await refresh();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '上传失败');
  } finally {
    saving.value = false;
  }
}

async function download(item: LibraryDocument): Promise<void> {
  try {
    const blob = await downloadLibraryDocument(item.id);
    triggerBlobDownload(blob, item.fileName);
    await refresh();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '下载失败');
  }
}

async function preview(item: LibraryDocument): Promise<void> {
  try {
    const blob = await previewLibraryDocument(item.id);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '预览失败，请改为下载查看');
  }
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function remove(item: LibraryDocument): Promise<void> {
  try {
    await ElMessageBox.confirm(`删除后无法恢复：${item.title}`, '确认删除文件？', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }
  try {
    await removeLibraryDocument(item.id);
    ElMessage.success('文件已删除');
    await refresh();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '删除失败');
  }
}

async function probe(): Promise<void> {
  // 首次进入时校验权限，避免无权限账号看到空列表
  try {
    await apiRequest('/library/documents?page=1&pageSize=1');
  } catch {
    // 权限不足时 refresh 已给出提示
  }
}

onMounted(() => {
  void probe();
  void refresh();
});
</script>

<template>
  <main class="ui-page library-page">
    <AppPageHeader
      description="公司制度、法规政策、宣传材料与照片集中存放，可在线查看与下载。"
      eyebrow="业务中心"
      title="公司文件制度"
    >
      <template #actions>
        <div v-if="canManage" class="ui-actions">
          <el-button type="primary" :icon="Upload" @click="openUpload">上传文件</el-button>
        </div>
      </template>
    </AppPageHeader>

    <WorkspaceFilterBar label="文件筛选" :result-label="`共 ${total} 个文件`">
      <template #search>
        <el-input v-model="keyword" clearable :prefix-icon="Search" placeholder="搜索文件标题" aria-label="搜索文件" />
      </template>
      <template #filters>
        <el-select v-model="category" clearable placeholder="全部分类" aria-label="文件分类">
          <el-option
            v-for="item in LIBRARY_CATEGORIES"
            :key="item"
            :label="libraryCategoryLabels[item]"
            :value="item"
          />
        </el-select>
      </template>
    </WorkspaceFilterBar>

    <UiDataList
      :columns="columns"
      :loading="loading"
      :rows="items"
      empty-text="暂无文件，管理员上传后会显示在这里"
    >
      <template #cell-category="{ row }">{{ libraryCategoryLabels[row.category as LibraryCategory] }}</template>
      <template #cell-sizeBytes="{ row }">{{ formatSize(row.sizeBytes) }}</template>
      <template #cell-downloadCount="{ row }">{{ row.downloadCount }}</template>
      <template #cell-updatedAt="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
      <template #mobile-title="{ row }">
        <strong>{{ row.title }}</strong>
        <span class="ui-text-muted"> · {{ libraryCategoryLabels[row.category as LibraryCategory] }}</span>
      </template>
      <template #mobile-summary="{ row }">
        <div class="library-summary">
          <span>{{ formatSize(row.sizeBytes) }} · {{ row.uploaderName }} · {{ formatDateTime(row.updatedAt) }}</span>
          <span v-if="row.description">{{ row.description }}</span>
        </div>
      </template>
      <template #actions="{ row }">
        <div class="library-actions">
          <el-button v-if="isPreviewable(row)" link :icon="View" @click="preview(row)">查看</el-button>
          <el-button link :icon="Download" @click="download(row)">下载</el-button>
          <el-button v-if="canManage" link type="danger" :icon="Delete" @click="remove(row)">删除</el-button>
        </div>
      </template>
    </UiDataList>

    <UiPagination
      v-if="total > pageSize"
      v-model:page="page"
      v-model:page-size="pageSize"
      :page-sizes="[10, 20, 50]"
      :total="total"
      @change="changePage"
    />

    <UiDialog v-model="uploadOpen" title="上传文件" :width="560">
      <el-form label-position="top" @submit.prevent>
        <el-form-item label="选择文件" required>
          <div class="library-upload">
            <input
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.rtf,.zip,.rar,.7z,.png,.jpg,.jpeg,.gif,.webp,.bmp"
              aria-label="选择文件"
              type="file"
              @change="onFileChange"
            />
            <p class="ui-text-muted">
              支持文档、表格、PDF、图片与压缩包，单个文件不超过 20MB。{{ selectedFileName ? `已选择：${selectedFileName}` : '' }}
            </p>
          </div>
        </el-form-item>
        <el-form-item label="文件标题" required>
          <el-input v-model="uploadForm.title" :maxlength="200" placeholder="如：员工考勤管理制度（2026 版）" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="uploadForm.category">
            <el-option
              v-for="item in LIBRARY_CATEGORIES"
              :key="item"
              :label="libraryCategoryLabels[item]"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="说明">
          <el-input
            v-model="uploadForm.description"
            type="textarea"
            :autosize="{ minRows: 3, maxRows: 6 }"
            :maxlength="1000"
            placeholder="可选，补充适用范围或注意事项"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadOpen = false">取消</el-button>
        <el-button :loading="saving" type="primary" :icon="Plus" @click="submitUpload">上传</el-button>
      </template>
    </UiDialog>
  </main>
</template>

<style scoped>
.library-page { min-width: 0; }
.library-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 4px; }
.library-summary { display: grid; gap: 4px; color: var(--color-text-secondary); font-size: 12px; }
.library-upload { display: grid; gap: 6px; min-width: 0; }
.library-upload p { margin: 0; font-size: 12px; }
</style>
