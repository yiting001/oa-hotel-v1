import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const apiOrigin = process.env.OA_API_ORIGIN ?? 'http://127.0.0.1:3000';

export default defineConfig(({ command }) => ({
  // 生产构建使用相对路径，同一份产物可部署在根目录或 /oa/ 子路径；
  // 开发服务器仍使用根路径，保持现有代理与路由行为。
  base: command === 'build' ? './' : '/',
  build: {
    // 兼容较旧的安卓 WebView / 国产浏览器；缺失的内置 API 由 shared/polyfills.ts 补齐。
    target: ['chrome87', 'safari14'],
  },
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
}));
