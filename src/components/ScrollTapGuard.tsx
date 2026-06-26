"use client";

import { useEffect } from "react";

/**
 * Prevents accidental navigation when a tap is really the end of a scroll /
 * swipe gesture. If the finger moved more than a small threshold between
 * touchstart and touchend, we swallow the click that the browser fires next.
 * Clean taps (little movement) pass through untouched.
 */
export function ScrollTapGuard() {
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let suppressUntil = 0;
    const MOVE = 12; // px of movement that counts as a scroll, not a tap

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) return;
      const moved =
        Math.abs(t.clientX - startX) + Math.abs(t.clientY - startY);
      if (moved > MOVE) suppressUntil = Date.now() + 450;
    };
    const onClick = (e: MouseEvent) => {
      if (Date.now() < suppressUntil) {
        e.preventDefault();
        e.stopPropagation();
        suppressUntil = 0;
      }
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    // Capture phase so we intercept before the link/button handler.
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
