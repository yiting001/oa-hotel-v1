<script setup lang="ts">
import { ArrowLeft, Printer } from '@element-plus/icons-vue';
import type { DirectoryUser, DocumentPrintTemplate, DocumentType } from '@oa/contracts';
import { ElButton, ElResult, ElSkeleton } from 'element-plus';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiRequest } from '../../shared/api';
import { documentDetailPath, documentTypeMeta } from '../../shared/document';
import type { DepartmentOption } from '../../shared/directory';
import type { SealAsset } from '../seal/seal.types';
import BusinessPrintSheet from './components/BusinessPrintSheet.vue';
import {
  buildBusinessDocumentPrintModel,
  type BusinessDocumentPrintModel,
  type DocumentPrintEnvelope,
  type DocumentPrintReferences,
  type NamedReference,
} from './domain/document-print';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const errorMessage = ref('');
const model = ref<BusinessDocumentPrintModel | null>(null);
let loadSequence = 0;

const documentType = computed<DocumentType | null>(() => {
  const value = String(route.params.documentType ?? '');
  return isDocumentType(value) ? value : null;
});
const documentId = computed(() => String(route.params.id ?? ''));

onMounted(load);
watch(() => route.fullPath, load);

async function load(): Promise<void> {
  const sequence = ++loadSequence;
  const type = documentType.value;
  if (!type || !documentId.value) {
    errorMessage.value = '单据打印地址无效';
    model.value = null;
    return;
  }

  loading.value = true;
  errorMessage.value = '';
  model.value = null;
  try {
    const [envelope, template, users, departments, sealAssets] = await Promise.all([
      apiRequest<DocumentPrintEnvelope>(documentTypeMeta[type].apiPath(documentId.value)),
      apiRequest<DocumentPrintTemplate | null>(
        `/workflow/documents/${documentId.value}/print-template`,
      ),
      optionalRequest<DirectoryUser>('/auth/users'),
      optionalRequest<DepartmentOption>('/auth/departments'),
      isSealDocument(type) ? optionalRequest<SealAsset>('/seals/assets') : Promise.resolve([]),
    ]);
    if (sequence !== loadSequence) {
      return;
    }
    model.value = buildBusinessDocumentPrintModel(
      envelope,
      createReferences(users, departments, sealAssets),
      template,
    );
  } catch (error) {
    if (sequence === loadSequence) {
      errorMessage.value = error instanceof Error ? error.message : '单据打印数据加载失败';
    }
  } finally {
    if (sequence === loadSequence) {
      loading.value = false;
    }
  }
}

function backToDetail(): void {
  const type = documentType.value;
  if (type) {
    void router.push(documentDetailPath(type, documentId.value));
  }
}

function printDocument(): void {
  window.print();
}

async function optionalRequest<T>(path: string): Promise<T[]> {
  try {
    return await apiRequest<T[]>(path);
  } catch {
    return [];
  }
}

function createReferences(
  users: DirectoryUser[],
  departments: DepartmentOption[],
  sealAssets: SealAsset[],
): DocumentPrintReferences {
  return {
    users: users.map((item) => namedReference(item.id, item.displayName)),
    departments: departments.map((item) => namedReference(item.id, item.name)),
    sealAssets: sealAssets.map((item) => namedReference(item.id, item.name)),
  };
}

function namedReference(id: string, name: string): NamedReference {
  return { id, name };
}

function isDocumentType(value: string): value is DocumentType {
  return Object.hasOwn(documentTypeMeta, value);
}

function isSealDocument(type: DocumentType): boolean {
  return type === 'SEAL_BORROW' || type === 'SEAL_USE';
}
</script>

<template>
  <main class="business-print-page">
    <header class="business-print-toolbar">
      <ElButton :icon="ArrowLeft" @click="backToDetail">返回详情</ElButton>
      <div class="business-print-toolbar__title">
        <strong>{{ model?.title ?? '单据打印' }}</strong>
        <span v-if="model">{{ model.number }}</span>
      </div>
      <ElButton v-if="model" :icon="Printer" type="primary" @click="printDocument">打印</ElButton>
    </header>

    <section v-if="loading" class="business-print-loading" aria-busy="true">
      <ElSkeleton :rows="12" animated />
    </section>
    <ElResult
      v-else-if="errorMessage"
      icon="error"
      :sub-title="errorMessage"
      title="无法打开打印视图"
    >
      <template #extra>
        <ElButton type="primary" @click="load">重新加载</ElButton>
      </template>
    </ElResult>
    <section v-else-if="model" class="business-print-stage">
      <BusinessPrintSheet :model="model" />
    </section>
  </main>
</template>

<style src="./styles/business-document-print.css"></style>
