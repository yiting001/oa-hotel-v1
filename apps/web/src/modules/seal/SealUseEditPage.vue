<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import SealUseForm from './SealUseForm.vue';

const route = useRoute();
const documentId = computed(() => String(route.params.id));
</script>

<template>
  <SealUseForm :key="documentId" :document-id="documentId" />
</template>
