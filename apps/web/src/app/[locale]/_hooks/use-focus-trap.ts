'use client';

import { useEffect, useRef } from 'react';

/**
 * Trap focus inside a container while it is active.
 *
 * @description
 * Implements the W3C ARIA APG dialog focus-trap pattern:
 * - On activation, moves focus to the first focusable descendant of the
 *   container (or the container itself if none are found).
 * - While active, Tab / Shift+Tab cycle within the container's
 *   focusable descendants.
 * - On deactivation, restores focus to the element that was focused at
 *   the moment of activation (typically the trigger button that opened
 *   the dialog).
 *
 * @design
 * - Static descendant query — focusable elements are recomputed on every
 *   Tab keystroke, so DOM nodes added/removed after open are picked up
 *   without a MutationObserver. This is cheap for the small subtrees a
 *   modal contains and avoids the complexity / SE attack-surface of
 *   observing the document.
 * - The container ref is intentionally returned (not provided as a prop)
 *   so consumers can mount it anywhere in their JSX.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const first = focusables[0] ?? container;
    first.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (list.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (activeEl === firstEl || !container.contains(activeEl)) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (activeEl === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [active]);

  return containerRef;
}
