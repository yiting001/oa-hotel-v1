/**
 * 令牌读取器 —— 给 canvas / SVG 类渲染器用
 *
 * CSS 变量不能在 canvas 里引用，图表等渲染器需要在运行时拿到具体色值。
 * 这里统一从 `ui/tokens.css` 读，保证令牌只有一处定义；兜底值仅用于
 * 非 DOM 环境（测试 / 预渲染），取值与令牌一致。
 */

const fallbacks: Record<string, string> = {
  '--color-primary': '#0a0a0a',
  '--color-primary-strong': '#222222',
  '--color-primary-soft': '#f2f3f5',
  '--color-brand-coral': '#ff5530',
  '--color-brand-magenta': '#ea5ec1',
  '--color-brand-blue': '#1456f0',
  '--color-brand-blue-deep': '#1d4ed8',
  '--color-brand-purple': '#a855f7',
  '--color-success': '#1ba673',
  '--color-warning': '#bd780b',
  '--color-error': '#d45656',
  '--color-text': '#0a0a0a',
  '--color-text-secondary': '#45515e',
  '--color-text-tertiary': '#5f5f5f',
  '--color-text-quaternary': '#767a82',
  '--color-text-disabled': '#a8aab2',
  '--color-border': '#e5e7eb',
  '--color-border-soft': '#eaecf0',
  '--color-border-strong': '#ccd0d7',
  '--color-canvas': '#ffffff',
  '--color-surface': '#f7f8fa',
  '--color-surface-2': '#f7f8fa',
  '--color-surface-3': '#f2f3f5',
  '--color-surface-dark': '#0a0a0a',
  '--color-surface-dark-soft': '#181e25',
  '--color-surface-dark-elevated': '#222222',
  '--color-on-dark': '#ffffff',
  '--color-on-dark-soft': '#d3d5da',
  '--font-body': "'DM Sans', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif",
  '--font-display': "'DM Sans', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif",
};

/** 读取设计令牌；浏览器里以 CSS 变量为准，其余环境退回同值常量 */
export function designToken(name: keyof typeof fallbacks | string): string {
  if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') {
    return fallbacks[name] ?? '';
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || (fallbacks[name] ?? '');
}
