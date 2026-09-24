<script setup lang="ts">
import { Delete, Link as LinkIcon, List } from '@element-plus/icons-vue';
import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import { ref, watch } from 'vue';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
const linkUrl = ref('');
const linkPopoverOpen = ref(false);

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      link: { openOnClick: false, defaultProtocol: 'https' },
    }),
  ],
  editorProps: {
    attributes: {
      'aria-label': '内容正文',
      'aria-multiline': 'true',
      'data-testid': 'portal-content-body',
      class: 'portal-rich-editor__surface',
      role: 'textbox',
    },
  },
  onUpdate: ({ editor: current }) => emit('update:modelValue', current.getHTML()),
});

watch(
  () => props.modelValue,
  (value) => {
    if (!editor.value || editor.value.getHTML() === value) return;
    editor.value.commands.setContent(value, { emitUpdate: false });
  },
);

function openLinkEditor(): void {
  linkUrl.value = editor.value?.getAttributes('link').href ?? '';
  linkPopoverOpen.value = true;
}

function applyLink(): void {
  const value = linkUrl.value.trim();
  if (!editor.value) return;
  if (value) editor.value.chain().focus().extendMarkRange('link').setLink({ href: value }).run();
  else editor.value.chain().focus().extendMarkRange('link').unsetLink().run();
  linkPopoverOpen.value = false;
}
</script>

<template>
  <div class="portal-rich-editor">
    <div class="portal-rich-editor__toolbar" role="toolbar" aria-label="正文格式">
      <el-tooltip content="加粗">
        <el-button
          :class="{ 'is-active': editor?.isActive('bold') }"
          aria-label="加粗"
          size="small"
          @click="editor?.chain().focus().toggleBold().run()"
          ><strong>B</strong></el-button
        >
      </el-tooltip>
      <el-tooltip content="斜体">
        <el-button
          :class="{ 'is-active': editor?.isActive('italic') }"
          aria-label="斜体"
          size="small"
          @click="editor?.chain().focus().toggleItalic().run()"
          ><em>I</em></el-button
        >
      </el-tooltip>
      <el-tooltip content="二级标题">
        <el-button
          :class="{ 'is-active': editor?.isActive('heading', { level: 2 }) }"
          aria-label="二级标题"
          size="small"
          @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
          >H2</el-button
        >
      </el-tooltip>
      <el-tooltip content="项目列表">
        <el-button
          :class="{ 'is-active': editor?.isActive('bulletList') }"
          :icon="List"
          aria-label="项目列表"
          size="small"
          @click="editor?.chain().focus().toggleBulletList().run()"
        />
      </el-tooltip>
      <el-popover v-model:visible="linkPopoverOpen" placement="bottom" :width="300">
        <div class="portal-rich-editor__link-form">
          <el-input
            v-model="linkUrl"
            aria-label="链接地址"
            placeholder="https://"
            @keyup.enter="applyLink"
          />
          <el-button type="primary" @click="applyLink">应用</el-button>
        </div>
        <template #reference>
          <el-button
            :class="{ 'is-active': editor?.isActive('link') }"
            :icon="LinkIcon"
            aria-label="插入链接"
            size="small"
            @click="openLinkEditor"
          />
        </template>
      </el-popover>
      <el-tooltip content="清除格式">
        <el-button
          :icon="Delete"
          aria-label="清除格式"
          size="small"
          @click="editor?.chain().focus().clearNodes().unsetAllMarks().run()"
        />
      </el-tooltip>
    </div>
    <EditorContent :editor="editor" />
  </div>
</template>

<style scoped>
.portal-rich-editor {
  width: 100%;
  min-width: 0;
  overflow: hidden;
  background: var(--color-canvas);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
}
.portal-rich-editor:focus-within { border-color: var(--color-text); box-shadow: 0 0 0 1px var(--color-text) inset; }
.portal-rich-editor__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 7px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}
.portal-rich-editor__toolbar :deep(.el-button + .el-button) { margin-left: 0; }
.portal-rich-editor__toolbar :deep(.el-button.is-active) {
  color: var(--color-on-primary);
  background: var(--color-primary);
  border-color: var(--color-primary);
}
.portal-rich-editor__link-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
.portal-rich-editor :deep(.portal-rich-editor__surface) {
  min-height: 220px;
  padding: 14px;
  outline: 0;
  overflow-wrap: anywhere;
  line-height: 1.7;
}
.portal-rich-editor :deep(.portal-rich-editor__surface:empty::before) {
  color: var(--color-text-quaternary);
  content: '请输入正文';
  pointer-events: none;
}
.portal-rich-editor :deep(.portal-rich-editor__surface p) { margin: 0 0 0.75em; }
</style>
