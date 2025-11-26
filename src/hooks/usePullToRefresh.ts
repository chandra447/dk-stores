import { useState, useRef, useCallback, useEffect } from 'react';

interface PullToRefreshOptions {
  threshold?: number;
  disabled?: boolean;
  onRefresh?: () => Promise<void> | void;
}

export const usePullToRefresh = ({
  threshold = 80,
  disabled = false,
  onRefresh
}: PullToRefreshOptions = {}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startY = useRef<number | null>(null);
  const currentY = useRef<number | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;

    // Only allow pull-to-refresh when at the top of the page
    const container = containerRef.current || document.documentElement;
    if (container.scrollTop > 0) return;

    startY.current = e.touches[0].clientY;
    currentY.current = e.touches[0].clientY;
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || startY.current === null) return;

    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;

    // Only allow pulling down (positive delta)
    if (deltaY <= 0) return;

    // Check if we're still at the top of the container
    const container = containerRef.current || document.documentElement;
    if (container.scrollTop > 0) {
      startY.current = null;
      return;
    }

    e.preventDefault();
    setIsPulling(true);
    setPullDistance(Math.min(deltaY * 0.5, threshold * 1.5)); // Add resistance
  }, [disabled, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || startY.current === null) return;

    const shouldRefresh = pullDistance >= threshold;

    if (shouldRefresh && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);

      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull to refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }

    setIsPulling(false);
    startY.current = null;
    currentY.current = null;
  }, [disabled, pullDistance, threshold, onRefresh, isRefreshing]);

  const reset = useCallback(() => {
    setIsPulling(false);
    setPullDistance(0);
    setIsRefreshing(false);
    startY.current = null;
    currentY.current = null;
  }, []);

  // Set up event listeners
  useEffect(() => {
    const element = containerRef.current || document;

    if (!disabled) {
      element.addEventListener('touchstart', handleTouchStart, { passive: false });
      element.addEventListener('touchmove', handleTouchMove, { passive: false });
      element.addEventListener('touchend', handleTouchEnd);
      element.addEventListener('touchcancel', reset);
    }

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', reset);
    };
  }, [disabled, handleTouchStart, handleTouchMove, handleTouchEnd, reset]);

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    pullProgress: Math.min(pullDistance / threshold, 1),
    containerRef,
    reset
  };
};