import { useSyncExternalStore } from "./use-sync-external-store";

/**
 * Hook to track window scroll position.
 * Returns true if scrolled past the threshold, false otherwise.
 *
 * @param threshold - Y position in pixels to trigger (default: 400)
 * @returns boolean indicating if scrolled past threshold
 *
 * @example
 * const showScrollTop = useScrollPosition(400);
 */
export function useScrollPosition(threshold = 400): boolean {
	const subscribe = (onStoreChange: () => void) => {
		window.addEventListener("scroll", onStoreChange, { passive: true });
		return () => window.removeEventListener("scroll", onStoreChange);
	};

	const getSnapshot = () => {
		if (typeof window === "undefined") return false;
		return window.scrollY > threshold;
	};

	const getServerSnapshot = () => false; // Always false during SSR

	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
