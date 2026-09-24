<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>

<template>
  <section class="form-section ui-section">
    <div class="form-section__heading">
      <h2>{{ title }}</h2>
      <p v-if="description" class="ui-text-muted">{{ description }}</p>
    </div>
    <div class="form-section__body"><slot /></div>
  </section>
</template>

<style scoped>
.form-section { min-width: 0; margin: 0 0 32px; padding: 24px 0 0; border: 0; border-top: 1px solid var(--color-border); background: transparent; border-radius: 0; }
.form-section:first-child { padding-top: 0; border-top: 0; }
.form-section__heading { padding: 0 0 16px; }
.form-section__heading h2 { margin: 0; font-family: inherit; font-size: 18px; font-weight: 600; line-height: 1.4; letter-spacing: 0; }
.form-section__heading p { margin: 4px 0 0; font-size: 13px; line-height: 1.5; }
.form-section__body { min-width: 0; padding: 0; }
</style>
