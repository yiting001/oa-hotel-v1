import { createRouter, createWebHistory } from 'vue-router';
import Workbench from './Workbench.vue';
import ContractPage from '../modules/contract/ContractPage.vue';
import SealPage from '../modules/seal/SealPage.vue';
import SupplyPage from '../modules/supply/SupplyPage.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Workbench },
    { path: '/contract', component: ContractPage },
    { path: '/seal', component: SealPage },
    { path: '/supply', component: SupplyPage },
  ],
});
