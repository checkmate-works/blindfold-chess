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
   * Off on the shared game, where the board position alone decides what sits
   * below it. Only `local` mode (the just-finished result screen) needs the tab
   * to follow the board. Passing `false` makes every wrapper a pass-through.
   */
  enabled: boolean;
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
 * Keep the result screen's [Summary | Discussion] tab in step with the board.
 *
 * On the shared game nothing is needed: the board position alone decides what
 * renders below it — the opening board shows the overview, any move position
 * shows that move's comment thread. The local (result) screen has no per-move
 * thread and its overview does not move with the board, so the TAB is what has
 * to follow it, in both directions: stepping onto a move reveals the Discussion,
 * stepping back to the opening board restores the Summary.
 *
 * Only real interactions may switch it. The programmatic initial landing (a
 * deep link, or the setup position of a seeded game) must leave the Summary
 * visible, which is why this wraps the navigation callbacks and flags the
 * intent, rather than watching `currentPosition` directly: an effect on the
 * position alone cannot tell a user's click from the mount-time jump.
 */
export function useOverviewPositionSync({
  enabled,
  currentPosition,
  navigation,
  setOverviewView,
}: Options): UseOverviewPositionSyncReturn {
  const syncToPosition = useCallback(
    (position: number) => {
      if (enabled) setOverviewView(position === -2 ? 'summary' : 'discussion');
    },
    [enabled, setOverviewView]
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
