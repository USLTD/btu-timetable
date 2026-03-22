import { useRef, useCallback } from 'react';

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

/**
 * Lightweight swipe detection hook.
 * Returns touch handlers to attach to a container element.
 */
export function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void, minDistance = 50): SwipeHandlers {
  const startX = useRef(0);
  const startY = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;
    // Only trigger if horizontal movement is greater than vertical (not a scroll)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minDistance) {
      if (dx < 0) onSwipeLeft();
      else onSwipeRight();
    }
  }, [onSwipeLeft, onSwipeRight, minDistance]);

  return { onTouchStart, onTouchEnd };
}
