<script setup lang="ts">
import { CopyDocument, Plus } from '@element-plus/icons-vue';
import { ElButton, ElEmpty, ElIcon, ElScrollbar, ElTag, ElTooltip } from 'element-plus';

interface VersionSummary {
  id: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'RETIRED';
  updatedAt: string;
}

interface DefinitionSummary {
  id: string;
  code: string;
  name: string;
  active: boolean;
  versions: VersionSummary[];
}

withDefaults(
  defineProps<{
    definitions: DefinitionSummary[];
    selectedDefinitionId: string | null;
    selectedVersionId: string | null;
    loading: boolean;
    noun: string;
    readonly?: boolean;
  }>(),
  { readonly: false },
);

const emit = defineEmits<{
  create: [];
  selectDefinition: [id: string];
  selectVersion: [definitionId: string, versionId: string];
  copyVersion: [definitionId: string, versionId: string];
}>();

function statusType(status: VersionSummary['status']): 'success' | 'warning' | 'info' {
  if (status === 'PUBLISHED') return 'success';
  if (status === 'DRAFT') return 'warning';
  return 'info';
}

function statusLabel(status: VersionSummary['status']): string {
  return { DRAFT: '草稿', PUBLISHED: '已发布', RETIRED: '已停用' }[status];
}
</script>

<template>
  <aside class="definition-nav" aria-label="定义版本导航">
    <div class="definition-nav__header">
      <div>
        <strong>{{ noun }}库</strong>
        <small>{{ definitions.length }} 个定义</small>
      </div>
      <ElTooltip v-if="!readonly" :content="`新建${noun}`" placement="top">
        <ElButton :aria-label="`新建${noun}`" circle type="primary" @click="emit('create')">
          <ElIcon><Plus /></ElIcon>
        </ElButton>
      </ElTooltip>
    </div>

    <ElScrollbar v-loading="loading" class="definition-nav__scroll">
      <ElEmpty
        v-if="!loading && definitions.length === 0"
        :description="`暂无${noun}`"
        :image-size="72"
      />
      <div v-else class="definition-nav__items">
        <section
          v-for="definition in definitions"
          :key="definition.id"
          class="definition-nav__item"
          :class="{ 'is-active': definition.id === selectedDefinitionId }"
        >
          <button
            class="definition-nav__definition"
            type="button"
            @click="emit('selectDefinition', definition.id)"
          >
            <span>
              <strong>{{ definition.name }}</strong>
              <small>{{ definition.code }}</small>
            </span>
            <ElTag v-if="!definition.active" size="small" type="info">停用</ElTag>
          </button>
          <div v-if="definition.id === selectedDefinitionId" class="definition-nav__versions">
            <button
              v-for="version in [...definition.versions].sort((a, b) => b.version - a.version)"
              :key="version.id"
              class="definition-nav__version"
              :class="{ 'is-active': version.id === selectedVersionId }"
              type="button"
              @click="emit('selectVersion', definition.id, version.id)"
            >
              <span>V{{ version.version }}</span>
              <ElTag :type="statusType(version.status)" effect="plain" size="small">
                {{ statusLabel(version.status) }}
              </ElTag>
              <ElTooltip v-if="!readonly" content="复制为新草稿" placement="top">
                <ElButton
                  :aria-label="`复制 V${version.version}`"
                  circle
                  size="small"
                  text
                  @click.stop="emit('copyVersion', definition.id, version.id)"
                >
                  <ElIcon><CopyDocument /></ElIcon>
                </ElButton>
              </ElTooltip>
            </button>
          </div>
        </section>
      </div>
    </ElScrollbar>
  </aside>
</template>
