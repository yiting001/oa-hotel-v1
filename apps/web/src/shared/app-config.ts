import { appBasePath } from './app-base';

const defaultCompanyName = '东方饭店';
const defaultProductName = '企业协同办公';

export const appConfig = Object.freeze({
  companyName: import.meta.env.VITE_OA_COMPANY_NAME?.trim() || defaultCompanyName,
  productName: import.meta.env.VITE_OA_PRODUCT_NAME?.trim() || defaultProductName,
});

const base = appBasePath();

export const brandAssets = Object.freeze({
  /** 东方饭店官方标志（徽标版，透明底），用于侧栏、登录页与打印抬头。 */
  logoMark: `${base}brand/logo-mark.webp`,
  loginBackground: `${base}assets/hotel/dongfang-courtyard-dusk.webp`,
  portalBanner: `${base}assets/hotel/dongfang-courtyard-day.webp`,
  portalNewsFallback: `${base}assets/hotel/dongfang-tower-sunset.webp`,
});
