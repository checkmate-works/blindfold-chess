'use client';

import { type RefObject, useEffect, useRef } from 'react';

/**
 * Scroll the puzzle's PageTitle into view after the opponent
 * auto-plays a reply, so the "White plays Nh2" announcement actually
 * lands in the viewport instead of being hidden below the
 * MoveInputPanel on narrow viewports.
 *
 * Returns the ref the caller pins to the title's anchor element.
 *
 * @design Defer scrolls to `requestAnimationFrame`
 * Earlier inline versions ran `scrollIntoView` directly in the
 * effect, but on mobile / narrow viewports the post-submit DOM
 * mutation (error-message clear, legal-moves hint toggle, etc.) can
 * happen on the same commit, and Safari / Chrome-on-iOS will silently
 * no-op a smooth scroll requested mid-commit. Deferring to one rAF
 * guarantees layout is flushed and paint has started before we ask
 * the browser to scroll — after that the scroll always lands.
 *
 * @design Blur active element first
 * When the user submits via the text input, the on-screen keyboard
 * can keep the input pinned to the visual viewport, which causes
 * `scrollIntoView` to align against the keyboard's offset instead of
 * the real page top. Blurring collapses the virtual keyboard; the
 * subsequent rAF then scrolls the fully-collapsed viewport.
 *
 * @design Dual scroll path
 * Run `scrollIntoView` AND an imperative `window.scrollTo` by
 * computed Y. Both are idempotent — if the first already landed at
 * the right place the second is a no-op; but if the first silently
 * refuses (Safari's treatment of smooth scroll under certain focus /
 * virtual-keyboard states), the second still succeeds. If a future
 * layout introduces an overflow-scroll ancestor that breaks
 * `scrollIntoView`, the imperative path keeps working.
 *
 * @design Trigger on `playerMoveCount`, not the opponent SAN
 * Dependency uses `playerMoveCount` rather than `lastOpponentMove`
 * itself: if the same opponent SAN happens to come up twice in a row
 * (transposition into the same reply), the primitive-string
 * comparison would treat it as unchanged and skip the scroll; keying
 * off the move count instead refires on every accepted player move.
 * `lastOpponentMove` is still listed so a single-move puzzle that
 * has an opponent reply still triggers the scroll on that single
 * transition.
 */
export function usePuzzleScroll({
  playerMoveCount,
  lastOpponentMove,
}: {
  playerMoveCount: number;
  lastOpponentMove: string | null;
}): RefObject<HTMLDivElement | null> {
  const titleAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (playerMoveCount === 0) return;
    if (lastOpponentMove === null) return;

    if (typeof document !== 'undefined') {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body) {
        active.blur();
      }
    }

    const raf = requestAnimationFrame(() => {
      const anchor = titleAnchorRef.current;
      if (!anchor) return;

      if (typeof anchor.scrollIntoView === 'function') {
        try {
          anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
          // Safari < 15.4 rejects the options-object form; fall
          // through to the imperative path below.
        }
      }
      try {
        const y = anchor.getBoundingClientRect().top + window.scrollY;
        if (Math.abs(y - window.scrollY) > 1) {
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      } catch {
        try {
          window.scrollTo(0, anchor.getBoundingClientRect().top + window.scrollY);
        } catch {
          if (document.documentElement) document.documentElement.scrollTop = 0;
        }
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [playerMoveCount, lastOpponentMove]);

  return titleAnchorRef;
}
