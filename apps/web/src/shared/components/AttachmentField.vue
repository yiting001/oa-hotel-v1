<script setup lang="ts">
import { PaperClipOutlined, UploadOutlined } from '@ant-design/icons-vue';
import type { UploadFile, UploadProps } from 'ant-design-vue';
import { computed } from 'vue';

const props = withDefaults(defineProps<{ modelValue: string[]; readonly?: boolean }>(), {
  readonly: false,
});
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>();

const fileList = computed<UploadFile[]>(() =>
  props.modelValue.map((name, index) => ({
    uid: `${index}-${name}`,
    name,
    status: 'done',
  })),
);

const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  if (props.readonly) {
    return false;
  }
  if (!props.modelValue.includes(file.name)) {
    emit('update:modelValue', [...props.modelValue, file.name]);
  }
  return false;
};

const remove: UploadProps['onRemove'] = (file) => {
  if (props.readonly) {
    return false;
  }
  emit(
    'update:modelValue',
    props.modelValue.filter((name) => name !== file.name),
  );
  return true;
};
</script>

<template>
  <a-upload
    :before-upload="beforeUpload"
    :disabled="readonly"
    :file-list="fileList"
    :multiple="true"
    :show-upload-list="{
      showDownloadIcon: false,
      showPreviewIcon: false,
      showRemoveIcon: !readonly,
    }"
    @remove="remove"
  >
    <a-button v-if="!readonly">
      <template #icon><UploadOutlined /></template>
      选择附件
    </a-button>
  </a-upload>
  <div v-if="modelValue.length" class="attachment-count">
    <PaperClipOutlined /> {{ readonly ? '共' : '已选择' }} {{ modelValue.length }} 个文件
  </div>
</template>
