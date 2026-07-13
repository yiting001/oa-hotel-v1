import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './app/App.vue';
import { router } from './app/router';
import './style.css';

createApp(App).use(Antd).use(createPinia()).use(router).mount('#app');
