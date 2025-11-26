import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh?: () => Promise<void> | void;
  threshold?: number;
  disabled?: boolean;
  className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  threshold = 80,
  disabled = false,
  className = ''
}) => {
  const {
    isPulling,
    isRefreshing,
    pullDistance,
    pullProgress,
    containerRef
  } = usePullToRefresh({
    threshold,
    disabled,
    onRefresh
  });

  return (
    <div
      ref={containerRef}
      className={`relative h-full overflow-hidden ${className}`}
    >
      {/* Pull to refresh indicator */}
      <AnimatePresence>
        {(isPulling || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
            style={{
              transform: `translateY(${Math.min(pullDistance - 20, threshold - 20)}px)`,
            }}
          >
            <motion.div
              className="bg-background/90 backdrop-blur-sm rounded-full p-3 shadow-lg border border-border/50"
              animate={{
                scale: isRefreshing ? 1 : 0.8 + (pullProgress * 0.2),
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
              }}
            >
              <motion.div
                animate={{
                  rotate: isRefreshing ? 360 : 0,
                }}
                transition={{
                  duration: isRefreshing ? 1 : 0,
                  ease: "linear",
                  repeat: isRefreshing ? Infinity : 0,
                }}
              >
                <Loader2
                  className="w-5 h-5 text-primary"
                  style={{
                    opacity: isRefreshing ? 1 : pullProgress,
                  }}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <motion.div
        className="h-full"
        animate={{
          y: isPulling ? Math.min(pullDistance, threshold) : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
      >
        {children}
      </motion.div>

      {/* Pull progress indicator (subtle background effect) */}
      <AnimatePresence>
        {isPulling && pullProgress > 0.5 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: pullProgress * 0.1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"
            style={{
              transform: `translateY(${Math.min(pullDistance - threshold, 0)}px)`,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};