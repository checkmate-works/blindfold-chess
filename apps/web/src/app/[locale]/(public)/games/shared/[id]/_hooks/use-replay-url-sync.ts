'use client';

import { useEffect, useRef } from 'react';

import { OVERVIEW_TAB_PARAM, overviewTabParamValue } from '../_lib/overview-tab-param';
import type { OverviewView } from './use-review-overview';

type Params = {
  currentPosition: number;
  notationMovesLength: number;
  effectiveFlipped: boolean;
  /** The overview tab actually rendered (see `useReviewOverview`). */
  overviewView: OverviewView;
};

/**
 * Mirror the replay's navigation state in the URL so the address bar tracks
 * the move on the board (`#<half-move>`, Lichess-style), the orientation
 * (`?color=white|black`) and the overview tab (`?tab=ai-review`), and a shared
 * link — or the history entry a back navigation returns to — reopens at the
 * same state. All use `replaceState` (no server round-trip / history spam:
 * stepping through forty moves and three tabs must not be forty-three stops
 * on the back button).
 *
 * The writes are gated behind a "settled" flag: Next's App Router resets the
 * URL to the navigation target once the initial render settles, so any write
 * during load is reverted anyway — and writing the initial move/orientation
 * would just flicker. Shared links keep their state because it is in the loaded
 * URL itself, not written client-side.
 */
export function useReplayUrlSync({
  currentPosition,
  notationMovesLength,
  effectiveFlipped,
  overviewView,
}: Params) {
  const syncReadyRef = useRef(false);
  useEffect(() => {
    const id = window.setTimeout(() => {
      syncReadyRef.current = true;
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  // Reflect the move on the board in the URL hash (`#<half-move>`).
  useEffect(() => {
    if (!syncReadyRef.current) return;
    const moveNumber =
      currentPosition >= 0 ? currentPosition + 1 : currentPosition === -1 ? notationMovesLength : 0;
    const url = new URL(window.location.href);
    url.searchParams.delete('comment');
    url.hash = moveNumber > 0 ? String(moveNumber) : '';
    window.history.replaceState(window.history.state, '', url);
  }, [currentPosition, notationMovesLength]);

  // Reflect the board orientation as `?color=white|black` once the viewer flips.
  useEffect(() => {
    if (!syncReadyRef.current) return;
    const orientationColor = effectiveFlipped ? 'black' : 'white';
    const url = new URL(window.location.href);
    url.searchParams.set('color', orientationColor);
    window.history.replaceState(window.history.state, '', url);
  }, [effectiveFlipped]);

  // Reflect the overview tab as `?tab=` once it changes — by the viewer's click
  // or by stepping onto a move (which selects the Discussion). Like the others,
  // the initial tab is not written: a URL that carries none reopens on the
  // page's default, and one that names a tab has it already.
  useEffect(() => {
    if (!syncReadyRef.current) return;
    const url = new URL(window.location.href);
    url.searchParams.set(OVERVIEW_TAB_PARAM, overviewTabParamValue(overviewView));
    window.history.replaceState(window.history.state, '', url);
  }, [overviewView]);
}
