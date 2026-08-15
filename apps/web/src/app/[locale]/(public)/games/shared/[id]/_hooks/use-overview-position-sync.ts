'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';

type Navigate = {
  navigateToStart: () => void;
  navigatePrevious: () => void;
  navigateNext: () => void;
  navigateToEnd: () => void;
  navigateToPosition: (position: number) => void;
};

type Options = {
  /**
   * What a jump back to the opening board (-2) selects.
   *
   * `summary` — the result screen, whose Discussion tab holds only a share CTA
   * on the opening board, so the Summary is the useful half there.
   *
   * `keep` — the shared game, whose opening-board Discussion tab is the
   * whole-game thread. This page deliberately leads with the discussion when it
   * has one (see `useReviewOverview`), so stepping back must not overrule the
   * viewer's tab.
   */
  atInitialPosition: 'summary' | 'keep';
  currentPosition: number;
  navigation: Navigate;
  setOverviewView: (view: 'summary' | 'discussion') => void;
};

export type UseOverviewPositionSyncReturn = {
  /**
   * The navigation callbacks, wrapped so a USER-driven move also moves the
   * overview tab. Hand these to the board and move list in place of the raw ones.
   */
  userNav: {
    toStart: () => void;
    previous: () => void;
    next: () => void;
    toEnd: () => void;
    toPosition: (position: number) => void;
  };
  /**
   * Point the tab at an arbitrary position — for a jump that did not come
   * through `userNav`, notably the quick-peek modal's "open this position".
   */
  syncToPosition: (position: number) => void;
};

/**
 * Keep the overview's [Summary | Discussion | …] tab in step with the board.
 *
 * The tabs stay mounted at every board position, so the tab — not the position
 * — decides what renders below the board. Stepping onto a move is a request to
 * look at that move, so it selects the Discussion, which is that move's thread
 * on the shared game and the (position-independent) discussion side on the
 * result screen. The Summary and AI Review stay one click away instead of
 * disappearing, which is the point of following rather than swapping.
 *
 * Only real interactions may switch it. The programmatic initial landing (the
 * setup position of a seeded game on the result screen) must leave the Summary
 * visible, which is why this wraps the navigation callbacks and flags the
 * intent, rather than watching `currentPosition` directly: an effect on the
 * position alone cannot tell a user's click from the mount-time jump. A deep
 * link IS a request to read a given move, so the shared page routes its landing
 * through `syncToPosition` explicitly (see `useReplayDeepLink`'s `onLand`).
 */
export function useOverviewPositionSync({
  atInitialPosition,
  currentPosition,
  navigation,
  setOverviewView,
}: Options): UseOverviewPositionSyncReturn {
  const syncToPosition = useCallback(
    (position: number) => {
      if (position !== -2) setOverviewView('discussion');
      else if (atInitialPosition === 'summary') setOverviewView('summary');
    },
    [atInitialPosition, setOverviewView]
  );

  // Set by the wrappers below, consumed by the effect once the navigation has
  // actually landed — the new position is only known after the render it causes.
  const pendingUserNavRef = useRef(false);

  const { navigateToStart, navigatePrevious, navigateNext, navigateToEnd, navigateToPosition } =
    navigation;

  const withSync = useCallback(
    <A extends unknown[]>(navigate: (...args: A) => void) =>
      (...args: A) => {
        pendingUserNavRef.current = true;
        navigate(...args);
      },
    []
  );

  useEffect(() => {
    if (!pendingUserNavRef.current) return;
    pendingUserNavRef.current = false;
    syncToPosition(currentPosition);
  }, [currentPosition, syncToPosition]);

  const userNav = useMemo(
    () => ({
      toStart: withSync(navigateToStart),
      previous: withSync(navigatePrevious),
      next: withSync(navigateNext),
      toEnd: withSync(navigateToEnd),
      toPosition: withSync(navigateToPosition),
    }),
    [withSync, navigateToStart, navigatePrevious, navigateNext, navigateToEnd, navigateToPosition]
  );

  return { userNav, syncToPosition };
}
