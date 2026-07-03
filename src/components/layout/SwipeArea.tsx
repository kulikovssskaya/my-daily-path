"use client";

import * as React from "react";
import { useUIStore } from "@/stores/uiStore";

/**
 * Enables edge-swipe (left -> right) to open the mobile nav drawer.
 * Only reacts to gestures that start near the left screen edge.
 */
export function SwipeArea({ children }: { children: React.ReactNode }) {
  const { openMobileNav, closeMobileNav, mobileNavOpen } = useUIStore();
  const startX = React.useRef<number | null>(null);
  const startY = React.useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    startX.current = t.clientX;
    startY.current = t.clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX.current;
    const dy = t.clientY - startY.current;

    const horizontal = Math.abs(dx) > Math.abs(dy) * 1.5;
    if (horizontal && Math.abs(dx) > 60) {
      // Open when swiping right from the left edge
      if (dx > 0 && startX.current < 32 && !mobileNavOpen) {
        openMobileNav();
      }
      // Close when swiping left while open
      if (dx < 0 && mobileNavOpen) {
        closeMobileNav();
      }
    }
    startX.current = null;
    startY.current = null;
  };

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="contents">
      {children}
    </div>
  );
}
