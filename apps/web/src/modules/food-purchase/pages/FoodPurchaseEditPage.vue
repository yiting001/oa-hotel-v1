<script setup lang="ts">
import { useRoute } from 'vue-router';
import FoodPurchaseForm from '../components/FoodPurchaseForm.vue';

const route = useRoute();
</script>

<template>
  <FoodPurchaseForm mode="edit" :document-id="String(route.params.id)" />
</template>
