let cachedBasePath: string | null = null;

/**
 * 应用部署根路径（以 / 结尾）。
 *
 * 生产构建使用相对 base（./），通过入口模块 URL 反推部署目录，
 * 因此同一份产物既能部署在域名根目录，也能部署在 /oa/ 这类子路径。
 */
export function appBasePath(): string {
  if (cachedBasePath !== null) return cachedBasePath;
  if (typeof document === 'undefined') {
    cachedBasePath = '/';
    return cachedBasePath;
  }
  const entry = Array.from(document.scripts).find(
    (script) => script.type === 'module' && Boolean(script.src),
  );
  if (!entry) {
    cachedBasePath = '/';
    return cachedBasePath;
  }
  const path = new URL('../', entry.src).pathname;
  cachedBasePath = path.endsWith('/') ? path : `${path}/`;
  return cachedBasePath;
}
