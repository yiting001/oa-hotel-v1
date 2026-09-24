import { computed, ref } from 'vue';

export type LayoutMode = 'desktop' | 'compact';
export const compactLayoutBoundary = 1024;

export function resolveLayoutMode(width: number): LayoutMode {
  return width < compactLayoutBoundary ? 'compact' : 'desktop';
}

const width = ref(typeof window === 'undefined' ? 1280 : window.innerWidth);
const touch = ref(false);
let listening = false;

function updateLayout(): void {
  width.value = window.innerWidth;
  touch.value = window.matchMedia('(pointer: coarse)').matches;
  document.documentElement.dataset.layout = resolveLayoutMode(width.value);
  document.documentElement.dataset.input = touch.value ? 'touch' : 'pointer';
}

export function initializeLayoutMode(): () => void {
  if (!listening && typeof window !== 'undefined') {
    updateLayout();
    window.addEventListener('resize', updateLayout, { passive: true });
    listening = true;
  }
  return () => {
    if (listening) window.removeEventListener('resize', updateLayout);
    listening = false;
  };
}

export function useLayoutMode() {
  if (typeof window !== 'undefined' && !listening) initializeLayoutMode();
  return {
    mode: computed(() => resolveLayoutMode(width.value)),
    isCompact: computed(() => resolveLayoutMode(width.value) === 'compact'),
    isTouch: computed(() => touch.value),
    viewportWidth: computed(() => width.value),
  };
}
