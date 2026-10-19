import { useEffect, useRef } from 'react';

function alignElementTop(elementId: string) {
  document.getElementById(elementId)?.scrollIntoView({ behavior: 'instant', block: 'start' });
}

/**
 * Scrolls to a DOM element by ID once when the component mounts (or when `enabled` becomes true).
 * Uses a 100ms delay to ensure the DOM is ready after render.
 *
 * @param elementId - The DOM element ID to scroll to
 * @param enabled - When false, scrolling is deferred until it becomes true (default: true)
 */
export function useScrollToElement(elementId: string, enabled: boolean = true) {
  const hasScrolled = useRef(false);

  useEffect(() => {
    if (!enabled || hasScrolled.current) return;
    hasScrolled.current = true;

    setTimeout(() => alignElementTop(elementId), 100);
  }, [elementId, enabled]);
}

/**
 * Re-applies the mount-time alignment of `useScrollToElement` after the next
 * render. Call it from the handler that moves a session on to its next
 * problem.
 *
 * A session's per-problem result view (answer boards, explanation, Next
 * button) is usually much taller than the input view that replaces it, and
 * the user has scrolled down to reach the Next button. Without re-aligning,
 * the browser keeps the scroll offset or anchors it to content below the
 * session, so the next problem opens with the site header back on screen —
 * or, when the result view sat outside the session wrapper, scrolled past the
 * new problem entirely with only the footer visible.
 *
 * The scroll runs in the next animation frame, after React has committed the
 * state change from the click handler and the page has its new height, and
 * before that frame paints. The element is looked up then, not now, so the id
 * only needs to exist in the view being switched to.
 */
export function realignToElement(elementId: string) {
  requestAnimationFrame(() => alignElementTop(elementId));
}
