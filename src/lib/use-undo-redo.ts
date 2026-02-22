import { useRef, useCallback, useEffect } from 'react';

/**
 * Lightweight undo/redo hook.
 * Takes the current state snapshot as a JSON-serializable value
 * and provides undo/redo functions.
 * Snapshots are stored in-memory (limited by `maxHistory`).
 */
export function useUndoRedo<T>(
  currentState: T,
  restore: (state: T) => void,
  maxHistory = 50,
) {
  const history = useRef<string[]>([]);
  const pointer = useRef(-1);
  const isRestoring = useRef(false);

  // Record new state when it changes
  useEffect(() => {
    if (isRestoring.current) {
      isRestoring.current = false;
      return;
    }
    const json = JSON.stringify(currentState);
    // Skip duplicate
    if (pointer.current >= 0 && history.current[pointer.current] === json) return;

    // Truncate any redo history beyond current pointer
    history.current = history.current.slice(0, pointer.current + 1);
    history.current.push(json);
    if (history.current.length > maxHistory) history.current.shift();
    pointer.current = history.current.length - 1;
  }, [currentState, maxHistory]);

  const canUndo = pointer.current > 0;
  const canRedo = pointer.current < history.current.length - 1;

  const undo = useCallback(() => {
    if (pointer.current <= 0) return;
    pointer.current -= 1;
    isRestoring.current = true;
    restore(JSON.parse(history.current[pointer.current]));
  }, [restore]);

  const redo = useCallback(() => {
    if (pointer.current >= history.current.length - 1) return;
    pointer.current += 1;
    isRestoring.current = true;
    restore(JSON.parse(history.current[pointer.current]));
  }, [restore]);

  return { undo, redo, canUndo, canRedo };
}
