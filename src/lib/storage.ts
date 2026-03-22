import { useCallback, useRef } from "preact/hooks";
import { useSyncExternalStore } from "../hooks/use-sync-external-store";
import { target } from "./event-listeners";

export const isBrowser =
  typeof window !== "undefined" && typeof localStorage !== "undefined";

export type AppStorageNamespace = "real" | "mock";

const FEATURE_FLAGS_KEY = "app-feature-flags";
const MOCK_PREFIX = "mock:";

let appStorageNamespace: AppStorageNamespace = "real";

function initNamespaceFromFlags() {
  if (!isBrowser) return;
  try {
    const raw = localStorage.getItem(FEATURE_FLAGS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    if (parsed["mock-data"]) {
      appStorageNamespace = "mock";
    }
  } catch {
    /* ignore */
  }
}

initNamespaceFromFlags();

export function getAppStorageNamespace() {
  return appStorageNamespace;
}

export function setAppStorageNamespace(namespace: AppStorageNamespace) {
  appStorageNamespace = namespace;
}

export const APP_STORAGE_KEYS = [
  "app-courses",
  "app-schedules",
  "app-rejections",
  "app-commute",
  "app-classes-per-day",
  "app-classes-per-day-enabled",
  "app-max-overlap",
  "app-max-overlap-enabled",
  "app-max-days-on-campus",
  "app-global-time",
  "app-day-settings",
  "app-lecturer-prefs",
  "app-min-rating",
] as const;

export type AppStorageKey = typeof APP_STORAGE_KEYS[number];

function resolveAppKey(
  key: AppStorageKey,
  namespace: AppStorageNamespace = appStorageNamespace,
) {
  return namespace === "mock" ? `${MOCK_PREFIX}${key}` : key;
}

// --- Low-level helpers ---

export function loadState<T>(key: string): T | undefined {
  if (!isBrowser) return undefined;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function saveState<T>(key: string, data: T): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
    // Notify same-tab listeners (storage event only fires cross-tab)
    window.dispatchEvent(new StorageEvent("storage", { key }));
  } catch {
    /* quota exceeded — silently ignore */
  }
}

export function removeState(key: string): void {
  if (!isBrowser) return;
  localStorage.removeItem(key);
}

export function loadAppState<T>(
  key: AppStorageKey,
  namespace: AppStorageNamespace = appStorageNamespace,
): T | undefined {
  return loadState<T>(resolveAppKey(key, namespace));
}

export function saveAppState<T>(
  key: AppStorageKey,
  data: T,
  namespace: AppStorageNamespace = appStorageNamespace,
): void {
  saveState(resolveAppKey(key, namespace), data);
}

export function clearAppState(
  keys: readonly AppStorageKey[] = APP_STORAGE_KEYS,
  namespace: AppStorageNamespace = appStorageNamespace,
): void {
  if (!isBrowser) return;
  for (const key of keys) {
    localStorage.removeItem(resolveAppKey(key, namespace));
  }
}

// --- useSyncExternalStore-based persisted state ---

type SetStateAction<T> = T | ((prev: T) => T);

export function usePersistedState<T>(
  key: string,
  defaultValue: T,
): [T, (v: SetStateAction<T>) => void] {
  // Cache to avoid reparsing JSON on every render
  const cache = useRef<{ raw: string | null; parsed: T } | null>(null);

  const getSnapshot = useCallback((): T => {
    if (!isBrowser) return defaultValue;
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

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!isBrowser) return () => {};
      const handler = (e: StorageEvent) => {
        if (e.key === key || e.key === null) onStoreChange();
      };

      const storage = target(window);

      storage.add("storage", handler);

      return () => storage.remove("storage", handler);
    },
    [key],
  );

  const getServerSnapshot = useCallback((): T => defaultValue, [defaultValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (action: SetStateAction<T>) => {
      const current = loadState<T>(key) ?? defaultValue;
      const next = action instanceof Function ? action(current) : action;
      saveState(key, next);
    },
    [key, defaultValue],
  );

  return [value, setValue];
}
