import { useState, useEffect, useCallback } from "preact/hooks";

/** Stores the `updateSW` function injected from main.tsx registerSW() */
let _updateSW: ((reload?: boolean) => void) | null = null;
let _listeners: (() => void)[] = [];

export function setUpdateSW(fn: (reload?: boolean) => void) {
  _updateSW = fn;
  for (const listener of _listeners) {
    listener();
  }
}

/** Notify React there's an update waiting */
let _needsRefresh = false;
export function notifyNeedsRefresh() {
  _needsRefresh = true;
  for (const listener of _listeners) {
    listener();
  }
}

export function usePwaUpdate() {
  const [needsRefresh, setNeedsRefresh] = useState(_needsRefresh);

  useEffect(() => {
    const listener = () => setNeedsRefresh(_needsRefresh);
    _listeners.push(listener);
    return () => { _listeners = _listeners.filter(l => l !== listener); };
  }, []);

  const applyUpdate = useCallback(() => {
    _updateSW?.(true);
  }, []);

  const dismiss = useCallback(() => {
    _needsRefresh = false;
    setNeedsRefresh(false);
  }, []);

  return { needsRefresh, applyUpdate, dismiss };
}
