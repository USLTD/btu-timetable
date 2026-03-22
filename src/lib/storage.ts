import { useSyncExternalStore, useCallback, useRef } from 'react';

// --- One-time migration: instructor → lecturer ---
(function migrateInstructorToLecturer() {
  try {
    const OLD_KEY = 'app-instructor-prefs';
    const NEW_KEY = 'app-lecturer-prefs';
    const raw = localStorage.getItem(OLD_KEY);
    if (raw && !localStorage.getItem(NEW_KEY)) {
      const parsed = JSON.parse(raw) as { instructor?: string; lecturer?: string; weight: string }[];
      const migrated = parsed.map(p => ({
        lecturer: p.lecturer ?? p.instructor ?? '',
        weight: p.weight,
      }));
      localStorage.setItem(NEW_KEY, JSON.stringify(migrated));
    }
    localStorage.removeItem(OLD_KEY);
  } catch { /* ignore */ }
})();

// --- Low-level helpers ---

export function loadState<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function saveState<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    // Notify same-tab listeners (storage event only fires cross-tab)
    window.dispatchEvent(new StorageEvent('storage', { key }));
  } catch { /* quota exceeded — silently ignore */ }
}

// --- useSyncExternalStore-based persisted state ---

type SetStateAction<T> = T | ((prev: T) => T);

export function usePersistedState<T>(key: string, defaultValue: T): [T, (v: SetStateAction<T>) => void] {
  // Cache to avoid re-parsing JSON on every render
  const cache = useRef<{ raw: string | null; parsed: T } | null>(null);

  const getSnapshot = useCallback((): T => {
    const raw = localStorage.getItem(key);
    // Return cache if raw hasn't changed
    if (cache.current && cache.current.raw === raw) return cache.current.parsed;
    if (raw === null) {
      cache.current = { raw, parsed: defaultValue };
      return defaultValue;
    }
    try {
      const parsed = JSON.parse(raw) as T;
      cache.current = { raw, parsed };
      return parsed;
    } catch {
      cache.current = { raw, parsed: defaultValue };
      return defaultValue;
    }
  }, [key, defaultValue]);

  const subscribe = useCallback((onStoreChange: () => void) => {
    const handler = (e: StorageEvent) => {
      if (e.key === key || e.key === null) onStoreChange();
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const setValue = useCallback((action: SetStateAction<T>) => {
    const current = loadState<T>(key) ?? defaultValue;
    const next = action instanceof Function ? action(current) : action;
    saveState(key, next);
  }, [key, defaultValue]);

  return [value, setValue];
}
