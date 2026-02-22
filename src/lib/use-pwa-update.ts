import { useState, useEffect, useCallback } from 'react';

/** Stores the `updateSW` function injected from main.tsx registerSW() */
let _updateSW: ((reload?: boolean) => void) | null = null;
let _listeners: (() => void)[] = [];

export function setUpdateSW(fn: (reload?: boolean) => void) {
  _updateSW = fn;
  _listeners.forEach(l => l());
}

/** Notify React there's an update waiting */
let _needsRefresh = false;
export function notifyNeedsRefresh() {
  _needsRefresh = true;
  _listeners.forEach(l => l());
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
