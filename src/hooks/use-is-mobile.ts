import { target } from "../lib/event-listeners";
import { useSyncExternalStore } from "./use-sync-external-store";

const MOBILE_BREAKPOINT = "(max-width: 768px)";

const mobileStore = {
  subscribe: (onStoreChange: () => void) => {
    if (typeof window === "undefined") return () => {};

    const mql = target(window.matchMedia(MOBILE_BREAKPOINT));

    const handleChange = () => onStoreChange();

    mql.add("change", handleChange);

    return () => {
      mql.remove("change", handleChange);
    };
  },
  getSnapshot: () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MOBILE_BREAKPOINT).matches;
  },

  getServerSnapshot: () => false,
};

export function useIsMobile(): boolean {
  return useSyncExternalStore(
    mobileStore.subscribe,
    mobileStore.getSnapshot,
    mobileStore.getServerSnapshot,
  );
}
