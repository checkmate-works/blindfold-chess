'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
 * - Uses a callback ref so activation re-runs when the container node
 *   actually attaches (e.g., when a parent component renders the
 *   container only after `mounted=true`). A plain `useRef` would be
 *   stale because the activation effect would fire before the ref
 *   binds.
 * - Static descendant query — focusable elements are recomputed on
 *   every Tab keystroke, so DOM nodes added/removed after open are
 *   picked up without a MutationObserver.
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
  const [node, setNode] = useState<T | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const containerRef = useCallback((el: T | null) => {
    setNode(el);
  }, []);

  useEffect(() => {
    if (!active || !node) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    const focusables = node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const first = focusables[0] ?? node;
    first.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (list.length === 0) {
        e.preventDefault();
        node.focus();
        return;
      }
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (activeEl === firstEl || !node.contains(activeEl)) {
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
      previouslyFocusedRef.current?.focus?.();
    };
  }, [active, node]);

  return containerRef;
}
