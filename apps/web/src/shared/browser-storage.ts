const memory = new Map<string, string>();

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * 受限浏览器（隐私模式、禁用网站存储、部分安卓 WebView）访问 localStorage 会直接抛异常，
 * 这里统一兜底到内存，保证当前会话仍可使用。
 */
export function readStorage(key: string): string | null {
  try {
    return getStorage()?.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

export function writeStorage(key: string, value: string): void {
  memory.set(key, value);
  try {
    getStorage()?.setItem(key, value);
  } catch {
    // 写入失败时保留内存副本。
  }
}

export function removeStorage(key: string): void {
  memory.delete(key);
  try {
    getStorage()?.removeItem(key);
  } catch {
    // 删除失败不影响内存副本。
  }
}
