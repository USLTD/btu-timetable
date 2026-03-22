import { useCallback, useEffect } from "preact/hooks";
import { saveState, usePersistedState } from "@/lib/storage";
import { useSyncExternalStore } from "@/hooks/use-sync-external-store";
import { target } from "@/lib/event-listeners";

export type Theme = "light" | "dark" | "system";

const THEME_KEY = "app-theme";
const LEGACY_THEMES: Theme[] = ["light", "dark", "system"];

function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && LEGACY_THEMES.includes(value as Theme);
}

function applyTheme(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#1f2937" : "#2563eb");
}

const DARK_MQ = "(prefers-color-scheme: dark)";

const themeStore = {
  subscribe: (onStoreChange: () => void) => {
    if (typeof window === "undefined") return () => {};

    const mql = target(window.matchMedia(DARK_MQ));
    const handleChange = () => onStoreChange();
    mql.add("change", handleChange);
    return () => mql.remove("change", handleChange);
  },

  getSnapshot: (): Theme => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia(DARK_MQ).matches ? "dark" : "light";
  },

  getServerSnapshot: (): Theme => "light",
};

export function useTheme() {
  const [theme, setTheme] = usePersistedState<Theme>(THEME_KEY, "system");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(THEME_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (isTheme(parsed)) return;
    } catch {
      if (isTheme(raw)) {
        saveState(THEME_KEY, raw);
      }
    }
  }, []);

  const systemTheme = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSnapshot,
    themeStore.getServerSnapshot,
  );

  const resolvedTheme: Theme = theme === "system" ? systemTheme : theme;

  useEffect(() => {
    applyTheme(resolvedTheme as "light" | "dark");
  }, [resolvedTheme]);

  const cycleTheme = useCallback(() => {
    setTheme((prev) => {
      const order: Theme[] = ["system", "light", "dark"];
      return order[(order.indexOf(prev) + 1) % 3];
    });
  }, [setTheme]);

  return { theme, setTheme, resolvedTheme, cycleTheme };
}
