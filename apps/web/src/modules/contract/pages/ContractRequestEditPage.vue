<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import ContractRequestForm from '../components/ContractRequestForm.vue';

const route = useRoute();
const documentId = computed(() => String(route.params.id));
</script>

<template>
  <ContractRequestForm :document-id="documentId" mode="edit" />
</template>
