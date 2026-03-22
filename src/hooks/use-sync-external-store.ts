import { useEffect, useRef, useState } from "preact/hooks";

type Subscribe = (onStoreChange: () => void) => () => void;
type GetSnapshot<T> = () => T;

export function useSyncExternalStore<T>(
  subscribe: Subscribe,
  getSnapshot: GetSnapshot<T>,
  getServerSnapshot?: GetSnapshot<T>,
): T {
  // Initial value (SSR-safe and hydration-safe)
  const [state, setState] = useState<T>(() => {
    if (getServerSnapshot) {
      // During SSR, window is undefined.
      // During initial client hydration, we MUST use getServerSnapshot 
      // to match the server-rendered HTML and avoid hydration mismatch.
      if (typeof window === "undefined") return getServerSnapshot();
      
      // If we are on the client but haven't mounted yet (first render),
      // we can check if it's hydration by seeing if body already has content.
      // But Vike specifically has an issue with persistent state. 
      // To be safe, we always initialize with getServerSnapshot if provided,
      // and let the useEffect instantly sync it to the client snapshot.
      return getServerSnapshot();
    }
    return getSnapshot();
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Subscribe to external store changes (runs on mount + when subscribe/getSnapshot change)
  useEffect(() => {
    return subscribe(() => {
      const nextSnapshot = getSnapshot();

      // Only update if value actually changed (prevents unnecessary renders)
      if (nextSnapshot !== stateRef.current) {
        setState(nextSnapshot);
      }
    });
  }, [subscribe, getSnapshot]);

  // Client-side hydration sync (if the server snapshot differed)
  useEffect(() => {
    if (getServerSnapshot && typeof window !== "undefined") {
      const clientSnapshot = getSnapshot();
      if (clientSnapshot !== state) {
        setState(clientSnapshot);
      }
    }
  }, [getServerSnapshot, getSnapshot, state]);

  return state;
}
