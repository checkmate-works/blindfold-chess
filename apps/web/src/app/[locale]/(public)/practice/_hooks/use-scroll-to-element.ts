import { useEffect, useRef } from 'react';

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

    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);
  }, [elementId, enabled]);
}
