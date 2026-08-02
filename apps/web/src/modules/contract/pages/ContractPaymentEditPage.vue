<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import ContractPaymentForm from '../components/ContractPaymentForm.vue';

const route = useRoute();
const documentId = computed(() => String(route.params.id));
</script>

<template>
  <ContractPaymentForm :document-id="documentId" mode="edit" />
</template>
