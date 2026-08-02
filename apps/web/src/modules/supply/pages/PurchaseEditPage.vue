<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import PurchaseDocumentForm from '../components/PurchaseDocumentForm.vue';

const route = useRoute();
const documentId = computed(() => String(route.params.id));
</script>

<template>
  <PurchaseDocumentForm :document-id="documentId" />
</template>
