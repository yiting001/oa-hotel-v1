/* 东方饭店 OA 离线壳：页面网络优先、哈希资源缓存优先、接口不缓存。 */
const BASE_PATH = new URL('./', self.location.href).pathname;
const appUrl = (path = '') => `${BASE_PATH}${path}`;
const SHELL_CACHE = 'oa-shell-v4';
const ASSET_CACHE = 'oa-assets-v4';
const CURRENT_CACHES = new Set([SHELL_CACHE, ASSET_CACHE]);
const PRECACHE_URLS = [
  appUrl(''),
  appUrl('index.html'),
  appUrl('offline.html'),
  appUrl('manifest.webmanifest'),
  appUrl('favicon.svg'),
  appUrl('icons/icon-192-v2.png'),
  appUrl('icons/icon-512-v2.png'),
  appUrl('icons/icon-maskable-512-v2.png'),
  appUrl('icons/apple-touch-icon-v2.png'),
  appUrl('brand/logo-mark.webp'),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'reload' });
            if (response.ok) await cache.put(url, response);
          } catch {
            // 单个资源预缓存失败不阻塞安装，联网后会按需补齐。
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => !CURRENT_CACHES.has(key)).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // 本 Service Worker 只处理自己部署目录下的请求，避免影响同域其他系统。
  if (!url.pathname.startsWith(BASE_PATH)) return;
  // 审批数据必须实时，永不缓存接口响应。
  if (url.pathname.startsWith(appUrl('api/'))) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  if (url.pathname.startsWith(appUrl('assets/')) || url.pathname.startsWith(appUrl('icons/'))) {
    event.respondWith(cacheFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(appUrl('index.html'), response.clone());
    }
    return response;
  } catch {
    const offline = await cache.match(appUrl('offline.html'));
    if (offline) return offline;
    const cached =
      (await cache.match(appUrl('index.html'))) ||
      (await cache.match(request)) ||
      (await cache.match(appUrl('')));
    if (cached) return cached;
    return new Response('当前处于离线状态，请连接网络后重试。', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  const revalidate = fetch(request)
    .then(async (response) => {
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  return cached || (await revalidate) || new Response('', { status: 504 });
}
