import ElementPlus from 'element-plus';
import elementZhCn from 'element-plus/es/locale/lang/zh-cn';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import RootApp from './app/App.vue';
import { router } from './app/router';
import { applyChineseDateLocale } from './shared/locale';
import { initializeLayoutMode } from './ui/useLayoutMode';
import './style.css';

applyChineseDateLocale();
initializeLayoutMode();

createApp(RootApp).use(ElementPlus, { locale: elementZhCn }).use(createPinia()).use(router).mount('#app');
