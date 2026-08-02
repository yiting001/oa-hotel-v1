<script setup lang="ts">
import { computed } from 'vue';
import { appConfig, companyMark } from '../../../shared/app-config';
import type { BusinessDocumentPrintModel } from '../domain/document-print';
import BusinessPrintSection from './BusinessPrintSection.vue';

const props = defineProps<{ model: BusinessDocumentPrintModel }>();

const sheetStyle = computed(() => ({
  '--business-print-margin-top': `${props.model.page.marginMm.top}mm`,
  '--business-print-margin-right': `${props.model.page.marginMm.right}mm`,
  '--business-print-margin-bottom': `${props.model.page.marginMm.bottom}mm`,
  '--business-print-margin-left': `${props.model.page.marginMm.left}mm`,
  '--business-print-grid-line': `${props.model.page.gridLineWidthPx}px`,
}));
</script>

<template>
  <article class="business-print-sheet" :style="sheetStyle">
    <header
      class="business-print-sheet__header"
      :class="{ 'business-print-sheet__header--without-number': !model.page.showDocumentNumber }"
    >
      <div class="business-print-brand" :aria-label="appConfig.companyName">
        <span class="business-print-brand__mark">{{ companyMark }}</span>
        <span>
          <strong>{{ appConfig.companyName }}</strong>
          <small>{{ appConfig.productName }}</small>
        </span>
      </div>
      <h1>{{ model.title }}</h1>
      <div v-if="model.page.showDocumentNumber" class="business-print-sheet__number">
        {{ model.numberLabel }}：{{ model.number || '-' }}
      </div>
    </header>

    <BusinessPrintSection v-for="section in model.sections" :key="section.id" :section="section" />

    <footer class="business-print-sheet__footer">
      <span>{{ appConfig.companyName }}{{ appConfig.productName }}</span>
      <span>
        {{ model.statusLabel }} · 修订 {{ model.revision }}
        <template v-if="model.formVersion"> · 表单 V{{ model.formVersion }}</template>
      </span>
    </footer>
  </article>
</template>
