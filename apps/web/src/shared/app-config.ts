import { theme as antdTheme } from 'ant-design-vue';

const defaultCompanyName = '东方饭店';
const defaultProductName = '企业协同办公';

export const appConfig = Object.freeze({
  companyName: import.meta.env.VITE_OA_COMPANY_NAME?.trim() || defaultCompanyName,
  productName: import.meta.env.VITE_OA_PRODUCT_NAME?.trim() || defaultProductName,
});

export const companyMark = appConfig.companyName.slice(0, 1).toUpperCase();

export const brandAssets = Object.freeze({
  loginBackground: '/assets/hotel/dongfang-courtyard-dusk.webp',
  portalBanner: '/assets/hotel/dongfang-courtyard-day.webp',
  portalNewsFallback: '/assets/hotel/dongfang-tower-sunset.webp',
});

export const antDesignTheme = Object.freeze({
  token: {
    colorPrimary: '#0d7069',
    colorText: '#182230',
    colorBorder: '#d9e0e7',
    borderRadius: 6,
    controlHeight: 36,
  },
});

export const antDesignDarkTheme = Object.freeze({
  algorithm: antdTheme.darkAlgorithm,
  token: {
    colorPrimary: '#5e6ad2',
    colorBgBase: '#0f1011',
    colorBgLayout: '#010102',
    colorTextBase: '#f7f8f8',
    colorBorder: '#34343a',
    colorBorderSecondary: '#23252a',
    borderRadius: 8,
    controlHeight: 36,
  },
});
