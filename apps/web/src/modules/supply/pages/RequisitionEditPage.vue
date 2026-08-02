<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import RequisitionDocumentForm from '../components/RequisitionDocumentForm.vue';

const route = useRoute();
const documentId = computed(() => String(route.params.id));
</script>

<template>
  <RequisitionDocumentForm :document-id="documentId" />
</template>
