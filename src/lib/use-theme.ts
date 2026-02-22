import { useState, useEffect, useCallback } from 'react';
import { usePersistedState } from './storage.ts';

export type Theme = 'light' | 'dark' | 'system';

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = usePersistedState<Theme>('app-theme', 'system');
  const [resolvedTheme, setResolved] = useState<'light' | 'dark'>(
    theme === 'system' ? getSystemTheme() : theme
  );

  useEffect(() => {
    if (theme !== 'system') {
      setResolved(theme);
      applyTheme(theme);
      return;
    }
    const resolved = getSystemTheme();
    setResolved(resolved);
    applyTheme(resolved);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const r = e.matches ? 'dark' : 'light';
      setResolved(r);
      applyTheme(r);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const cycleTheme = useCallback(() => {
    setTheme(prev => {
      const order: Theme[] = ['system', 'light', 'dark'];
      return order[(order.indexOf(prev) + 1) % 3];
    });
  }, [setTheme]);

  return { theme, setTheme, resolvedTheme, cycleTheme };
}

