<script setup lang="ts">
import { useRoute } from 'vue-router';
import OrderCirculationForm from '../components/OrderCirculationForm.vue';

const route = useRoute();
</script>

<template>
  <OrderCirculationForm mode="edit" :document-id="String(route.params.id)" />
</template>
