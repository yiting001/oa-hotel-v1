import { appBasePath } from './app-base';

export interface PwaEnvironment {
  production: boolean;
  serviceWorkerSupported: boolean;
}

/** 只在生产构建且浏览器支持 Service Worker 时注册离线壳。 */
export function shouldRegisterServiceWorker(environment: PwaEnvironment): boolean {
  return environment.production && environment.serviceWorkerSupported;
}

export function registerServiceWorker(): void {
  if (
    !shouldRegisterServiceWorker({
      production: import.meta.env.PROD,
      serviceWorkerSupported: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    })
  ) {
    return;
  }

  window.addEventListener('load', () => {
    const base = appBasePath();
    navigator.serviceWorker
      .register(`${base}sw.js`, { scope: base, updateViaCache: 'none' })
      .catch((error: unknown) => {
        // 非 HTTPS 或浏览器策略限制时注册会失败，不影响正常在线使用。
        console.warn('Service worker registration failed:', error);
      });
  });
}
