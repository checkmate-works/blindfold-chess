import { useLayoutEffect, useRef } from 'react';

function alignElementTop(elementId: string) {
  document.getElementById(elementId)?.scrollIntoView({ behavior: 'instant', block: 'start' });
}

/**
 * Aligns the top of the element with id `elementId` to the top of the
 * viewport, once, before the browser paints it — so the first frame the
 * player sees (a skeleton, usually) is already where the session will stay.
 *
 * The scroll runs in a layout effect, which fires after React has written the
 * commit to the DOM and before the browser paints it, so the element rendered
 * by that commit can already be found. Until the element exists the effect
 * keeps checking on every commit and scrolls on the one that renders it; a
 * loading view that renders no element would therefore paint unscrolled, which
 * is why each caller renders its skeleton inside the element carrying the id.
 *
 * The alignment is applied a second time in a microtask. On a client-side
 * navigation, Next.js's layout router runs its own scroll handling in a layout
 * effect of an ancestor, which runs after this one in the same commit: it
 * finds the new page's top above the viewport and puts the document back at
 * the top. A microtask queued here runs once the whole commit has finished,
 * after that reset and before the browser can paint, so it undoes the reset
 * before anything is drawn. The next animation frame is not soon enough: the
 * commit can land after that frame's callbacks have run, and the frame is
 * then painted at the top first (measured in Chrome on a challenge start).
 *
 * This replaced a 100ms timeout after mount, which outlasted both the late
 * element and the router's reset but let the browser paint the session at
 * the old offset first, so the page visibly jumped a moment after it appeared.
 *
 * @param elementId - The DOM element ID to scroll to
 * @param enabled - When false, scrolling is deferred until it becomes true (default: true)
 */
export function useScrollToElement(elementId: string, enabled: boolean = true) {
  const hasScrolled = useRef(false);

  // No dependency list: the element may appear in any later commit.
  useLayoutEffect(() => {
    if (!enabled || hasScrolled.current) return;
    if (document.getElementById(elementId) === null) return;
    hasScrolled.current = true;

    alignElementTop(elementId);
    queueMicrotask(() => alignElementTop(elementId));
  });
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
