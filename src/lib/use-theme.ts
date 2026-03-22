import { useSyncExternalStore, useCallback } from 'react';
import { usePersistedState } from './storage.ts';

export type Theme = 'light' | 'dark' | 'system';

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  // Update meta theme-color to match
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#1f2937' : '#2563eb');
}

// --- useSyncExternalStore for system preference ---

const DARK_MQ = '(prefers-color-scheme: dark)';

function subscribeSystemTheme(callback: () => void): () => void {
  const mql = window.matchMedia(DARK_MQ);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getSystemSnapshot(): 'light' | 'dark' {
  return window.matchMedia(DARK_MQ).matches ? 'dark' : 'light';
}

function getServerSnapshot(): 'light' | 'dark' {
  return 'light';
}

export function useTheme() {
  const [theme, setTheme] = usePersistedState<Theme>('app-theme', 'system');
  const systemTheme = useSyncExternalStore(subscribeSystemTheme, getSystemSnapshot, getServerSnapshot);

  const resolvedTheme: 'light' | 'dark' = theme === 'system' ? systemTheme : theme;

  // Apply whenever resolved theme changes
  applyTheme(resolvedTheme);

  const cycleTheme = useCallback(() => {
    setTheme(prev => {
      const order: Theme[] = ['system', 'light', 'dark'];
      return order[(order.indexOf(prev) + 1) % 3];
    });
  }, [setTheme]);

  return { theme, setTheme, resolvedTheme, cycleTheme };
}
