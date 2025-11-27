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
  const startScrollTop = useRef<number | null>(null);
  const currentY = useRef<number | null>(null);
  const isPullGesture = useRef<boolean>(false);
  const containerRef = useRef<HTMLElement | null>(null);
  const activeScrollParent = useRef<HTMLElement | null>(null);

  // Helper to find the actual scrollable parent of the target
  const getScrollParent = useCallback((node: HTMLElement): HTMLElement | null => {
    let current = node;
    const container = containerRef.current;

    while (current && current !== document.body && current !== document.documentElement) {
      // Stop if we reach the container ref
      if (container && current === container) break;

      const { overflowY } = window.getComputedStyle(current);
      const isScrollable = overflowY === 'auto' || overflowY === 'scroll';

      // Check if it's actually scrollable (content > height)
      if (isScrollable && current.scrollHeight > current.clientHeight) {
        return current;
      }

      current = current.parentElement as HTMLElement;
    }
    return null;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;

    const target = e.target as HTMLElement;
    // Find the scrollable parent that the user is interacting with
    activeScrollParent.current = getScrollParent(target);

    const scrollElement = activeScrollParent.current || containerRef.current || document.documentElement;

    // Must be at the very top to start pull-to-refresh
    if (scrollElement.scrollTop > 10) return; // Small threshold for safety

    const touch = e.touches[0];
    startY.current = touch.clientY;
    currentY.current = touch.clientY;
    startScrollTop.current = scrollElement.scrollTop;
    isPullGesture.current = false;
  }, [disabled, isRefreshing, getScrollParent]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || startY.current === null || startScrollTop.current === null) return;

    const touch = e.touches[0];
    currentY.current = touch.clientY;

    const deltaY = currentY.current - startY.current;
    const scrollElement = activeScrollParent.current || containerRef.current || document.documentElement;

    // Check if user has scrolled (not pulled)
    const hasScrolled = Math.abs(scrollElement.scrollTop - startScrollTop.current) > 5;

    // If user has scrolled, cancel the pull gesture
    if (hasScrolled) {
      setIsPulling(false);
      setPullDistance(0);
      isPullGesture.current = false;
      startY.current = null;
      startScrollTop.current = null;
      return;
    }

    // Only allow pulling down (positive delta)
    if (deltaY <= 5) return; // Small dead zone to prevent accidental triggers

    // Ensure we're still at the top
    if (scrollElement.scrollTop > 5) return;

    // Only consider it a pull gesture after moving a significant distance
    if (deltaY > 15 && !isPullGesture.current) {
      isPullGesture.current = true;
    }

    if (!isPullGesture.current) return;

    // Prevent default to stop native scrolling
    if (e.cancelable) {
      e.preventDefault();
    }

    setIsPulling(true);
    // Add resistance for more natural feel
    const resistance = 0.4;
    const maxPull = threshold * 1.2;
    setPullDistance(Math.min(deltaY * resistance, maxPull));
  }, [disabled, isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || !isPullGesture.current) {
      // Reset everything if this wasn't a pull gesture
      setIsPulling(false);
      setPullDistance(0);
      isPullGesture.current = false;
      startY.current = null;
      startScrollTop.current = null;
      currentY.current = null;
      activeScrollParent.current = null;
      return;
    }

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
    isPullGesture.current = false;
    startY.current = null;
    startScrollTop.current = null;
    currentY.current = null;
    activeScrollParent.current = null;
  }, [disabled, pullDistance, threshold, onRefresh, isRefreshing]);

  const reset = useCallback(() => {
    setIsPulling(false);
    setPullDistance(0);
    setIsRefreshing(false);
    isPullGesture.current = false;
    startY.current = null;
    startScrollTop.current = null;
    currentY.current = null;
    activeScrollParent.current = null;
  }, []);

  // Set up event listeners on the main scroll container
  useEffect(() => {
    if (disabled) return;

    const element = containerRef.current || document.documentElement;

    const touchStartHandler = (e: Event) => handleTouchStart(e as TouchEvent);
    const touchMoveHandler = (e: Event) => handleTouchMove(e as TouchEvent);
    const touchEndHandler = (e: Event) => handleTouchEnd(e as TouchEvent);
    const touchCancelHandler = (_: Event) => reset();

    // Use capture phase to get events before they bubble up
    element.addEventListener('touchstart', touchStartHandler, {
      passive: false,
      capture: true
    });
    element.addEventListener('touchmove', touchMoveHandler, {
      passive: false,
      capture: true
    });
    element.addEventListener('touchend', touchEndHandler, {
      capture: true
    });
    element.addEventListener('touchcancel', touchCancelHandler, {
      capture: true
    });

    return () => {
      element.removeEventListener('touchstart', touchStartHandler, true);
      element.removeEventListener('touchmove', touchMoveHandler, true);
      element.removeEventListener('touchend', touchEndHandler, true);
      element.removeEventListener('touchcancel', touchCancelHandler, true);
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