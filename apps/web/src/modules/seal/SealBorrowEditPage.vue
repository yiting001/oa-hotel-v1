<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import SealBorrowForm from './SealBorrowForm.vue';

const route = useRoute();
const documentId = computed(() => String(route.params.id));
</script>

<template>
  <SealBorrowForm :key="documentId" :document-id="documentId" />
</template>
