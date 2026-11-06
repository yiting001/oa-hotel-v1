import { appBasePath } from './app-base';

const defaultCompanyName = '东方饭店';
const defaultProductName = '企业协同办公';

export const appConfig = Object.freeze({
  companyName: import.meta.env.VITE_OA_COMPANY_NAME?.trim() || defaultCompanyName,
  productName: import.meta.env.VITE_OA_PRODUCT_NAME?.trim() || defaultProductName,
});

export const companyMark = appConfig.companyName.slice(0, 1).toUpperCase();

const base = appBasePath();

export const brandAssets = Object.freeze({
  loginBackground: `${base}assets/hotel/dongfang-courtyard-dusk.webp`,
  portalBanner: `${base}assets/hotel/dongfang-courtyard-day.webp`,
  portalNewsFallback: `${base}assets/hotel/dongfang-tower-sunset.webp`,
});
