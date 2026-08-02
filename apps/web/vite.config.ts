import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const apiOrigin = process.env.OA_API_ORIGIN ?? 'http://127.0.0.1:3000';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    allowedHosts: process.env.OA_DEV_ALLOWED_HOSTS?.split(',') ?? [],
    proxy: {
      '/api': apiOrigin,
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': apiOrigin,
    },
  },
});
