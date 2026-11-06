<script setup lang="ts">
import type { DocumentAttachmentItem } from '@oa/contracts';
import { Close, Download, Paperclip, Upload } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { computed, ref } from 'vue';
import { downloadDocumentAttachment, uploadDocumentAttachment } from '../attachment-api';

const props = withDefaults(
  defineProps<{
    modelValue: DocumentAttachmentItem[];
    readonly?: boolean;
    /** 自定义上传接口（审批人节点没有通用附件上传权限时使用）。 */
    uploadPath?: string;
  }>(),
  { readonly: false, uploadPath: undefined },
);
const emit = defineEmits<{ 'update:modelValue': [value: DocumentAttachmentItem[]] }>();
const uploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const items = computed(() => props.modelValue);

function attachmentName(item: DocumentAttachmentItem): string {
  return typeof item === 'string' ? item : item.fileName;
}

function attachmentId(item: DocumentAttachmentItem): string | null {
  return typeof item === 'string' ? null : item.id;
}

function openPicker(): void {
  if (props.readonly || uploading.value) return;
  fileInput.value?.click();
}

async function onFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || props.readonly) return;
  uploading.value = true;
  try {
    const uploaded = await uploadDocumentAttachment(file, props.uploadPath);
    emit('update:modelValue', [...props.modelValue, uploaded]);
    ElMessage.success(`已上传 ${uploaded.fileName}`);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '附件上传失败，请稍后重试');
  } finally {
    uploading.value = false;
  }
}

async function download(item: DocumentAttachmentItem): Promise<void> {
  const id = attachmentId(item);
  if (!id) return;
  try {
    const blob = await downloadDocumentAttachment(id);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = attachmentName(item);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '附件下载失败，请稍后重试');
  }
}

function remove(index: number): void {
  if (props.readonly) return;
  emit(
    'update:modelValue',
    props.modelValue.filter((_, itemIndex) => itemIndex !== index),
  );
}
</script>

<template>
  <div class="attachment-upload-field">
    <div v-if="!readonly" class="attachment-upload-field__entry">
      <input
        ref="fileInput"
        class="attachment-upload-field__input"
        type="file"
        aria-label="选择附件文件"
        @change="onFileChange"
      />
      <el-button :icon="Upload" :loading="uploading" @click="openPicker">上传附件</el-button>
      <small class="ui-text-muted">支持文档、表格、PDF、图片与压缩包，单个文件不超过 20MB。</small>
    </div>
    <ul v-if="items.length" class="attachment-upload-field__list" aria-label="附件清单">
      <li v-for="(item, index) in items" :key="`${attachmentName(item)}-${index}`">
        <el-icon aria-hidden="true"><Paperclip /></el-icon>
        <span>{{ attachmentName(item) }}</span>
        <el-button
          v-if="attachmentId(item)"
          link
          type="primary"
          :icon="Download"
          :aria-label="`下载${attachmentName(item)}`"
          @click="download(item)"
        >
          下载
        </el-button>
        <el-button
          v-if="!readonly"
          :icon="Close"
          text
          circle
          :aria-label="`移除${attachmentName(item)}`"
          @click="remove(index)"
        />
      </li>
    </ul>
    <p v-else class="attachment-upload-field__empty ui-text-muted">暂无附件</p>
  </div>
</template>

<style scoped>
.attachment-upload-field {
  min-width: 0;
}
.attachment-upload-field__entry {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  max-width: 640px;
}
.attachment-upload-field__input {
  display: none;
}
.attachment-upload-field__list {
  display: grid;
  gap: 0;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}
.attachment-upload-field__list li {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 36px;
  padding: 4px 2px;
  border-bottom: 1px solid var(--color-border);
}
.attachment-upload-field__list li > span {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}
.attachment-upload-field__list .el-icon {
  color: var(--color-text-secondary);
}
.attachment-upload-field__empty {
  margin: 8px 0 0;
  font-size: 12px;
}
</style>
