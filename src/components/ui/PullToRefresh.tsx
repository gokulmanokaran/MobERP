import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

const PULL_THRESHOLD = 80;  // px needed to trigger refresh
const INTENT_THRESHOLD = 10; // px moved before we decide: PTR or scroll

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  disabled = false,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const touchStartY = useRef(0);
  // States: 'idle' | 'deciding' | 'pulling' | 'scrolling'
  const gestureState = useRef<'idle' | 'deciding' | 'pulling' | 'scrolling'>('idle');

  const pullDistance = useMotionValue(0);
  const spinnerRotate = useTransform(pullDistance, [0, PULL_THRESHOLD], [0, 360]);
  const spinnerOpacity = useTransform(pullDistance, [0, 40, PULL_THRESHOLD], [0, 0.5, 1]);
  const pullY = useTransform(pullDistance, (d) => Math.min(d * 0.5, 45));

  // Find the scrollTop of the scrollable container the touch started in
  const getContainerScrollTop = useCallback((target: Element): number => {
    let el: Element | null = target;
    while (el && el !== containerRef.current) {
      const style = window.getComputedStyle(el);
      const ov = style.overflowY;
      if ((ov === 'auto' || ov === 'scroll') && el.scrollHeight > el.clientHeight) {
        return el.scrollTop;
      }
      el = el.parentElement;
    }
    return containerRef.current?.scrollTop ?? 0;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;

    const scrollTop = getContainerScrollTop(e.target as Element);

    // Only consider PTR if we're at the very top
    if (scrollTop <= 1) {
      touchStartY.current = e.touches[0].clientY;
      gestureState.current = 'deciding';
    } else {
      gestureState.current = 'idle';
    }
  }, [disabled, isRefreshing, getContainerScrollTop]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (gestureState.current === 'idle' || gestureState.current === 'scrolling') return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    if (gestureState.current === 'deciding') {
      if (Math.abs(diff) < INTENT_THRESHOLD) return; // Not enough movement yet

      if (diff > 0) {
        // Moving downward → user is pulling → enter PTR mode
        gestureState.current = 'pulling';
      } else {
        // Moving upward → user is just scrolling → ignore for the rest of this touch
        gestureState.current = 'scrolling';
        return;
      }
    }

    // We're in 'pulling' state
    if (diff > 0) {
      if (e.cancelable) e.preventDefault();
      pullDistance.set(diff);
    } else {
      pullDistance.set(0);
      gestureState.current = 'deciding';
    }
  }, [pullDistance]);

  const handleTouchEnd = useCallback(() => {
    if (gestureState.current !== 'pulling') {
      gestureState.current = 'idle';
      return;
    }

    gestureState.current = 'idle';
    const currentDistance = pullDistance.get();

    if (currentDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      animate(pullDistance, PULL_THRESHOLD, { type: 'spring', stiffness: 300, damping: 25 });
      onRefresh().finally(() => {
        setIsRefreshing(false);
        animate(pullDistance, 0, { type: 'spring', stiffness: 200, damping: 25 });
      });
    } else {
      animate(pullDistance, 0, { type: 'spring', stiffness: 300, damping: 25 });
    }
  }, [pullDistance, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div ref={containerRef} className="relative w-full overflow-y-auto" style={{ height: '100%' }}>
      {/* PTR Loading Circle */}
      <motion.div
        style={{ y: pullY, opacity: spinnerOpacity }}
        className="absolute top-2 left-0 right-0 z-50 flex justify-center pointer-events-none"
      >
        <motion.div
          style={{ rotate: isRefreshing ? undefined : spinnerRotate }}
          animate={isRefreshing ? { rotate: 360 } : {}}
          transition={isRefreshing ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : undefined}
          className="h-10 w-10 bg-white rounded-full shadow-md flex items-center justify-center border border-brand-border text-primary"
        >
          <RefreshCw size={18} className="stroke-[2.5]" />
        </motion.div>
      </motion.div>

      {/* Main Page Content */}
      <motion.div style={{ y: pullY }} className="w-full">
        {children}
      </motion.div>
    </div>
  );
};
