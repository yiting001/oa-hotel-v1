import { describe, expect, it } from 'vitest';
import { shouldRegisterServiceWorker } from './pwa';

describe('pwa', () => {
  it('只在生产环境且浏览器支持 Service Worker 时注册', () => {
    expect(shouldRegisterServiceWorker({ production: true, serviceWorkerSupported: true })).toBe(
      true,
    );
    expect(shouldRegisterServiceWorker({ production: false, serviceWorkerSupported: true })).toBe(
      false,
    );
    expect(shouldRegisterServiceWorker({ production: true, serviceWorkerSupported: false })).toBe(
      false,
    );
  });
});
