<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import PurchaseForm from '../components/PurchaseForm.vue';

const route = useRoute();
const documentId = computed(() => String(route.params.id));
</script>

<template>
  <PurchaseForm :document-id="documentId" mode="edit" />
</template>
