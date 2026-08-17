import { useEffect, useRef } from 'react';

import { usePathname } from 'next/navigation';

import type { AlgebraicNotation } from '@blindfold-chess/types';

import { writeSessionItem } from '@/lib/storage/session-storage';

import { isGameFinished } from '../_lib/game-utils';
import { SESSION_STORAGE_KEYS } from '../_lib/session-storage-keys';
import type { SaveGame } from './use-auto-save';

type UseAutoSaveEventsOptions = {
  saveGame: SaveGame;
  currentMovesRef: React.RefObject<AlgebraicNotation[]>;
  currentStatusRef: React.RefObject<string>;
  hasPlayerInteracted: React.RefObject<boolean>;
  hasPendingChanges: React.RefObject<boolean>;
  hasSavedInSession: React.RefObject<boolean>;
};

/**
 * Hook that manages event listeners for auto-saving:
 * - visibilitychange: saves when the page becomes hidden
 * - beforeunload: saves when the page is about to unload
 * - pathname change: sets toast flag when navigating away
 *
 * Each listener checks whether a save is needed and sets the toast flag
 * for the save notification when appropriate.
 */
export function useAutoSaveEvents({
  saveGame,
  currentMovesRef,
  currentStatusRef,
  hasPlayerInteracted,
  hasPendingChanges,
  hasSavedInSession,
}: UseAutoSaveEventsOptions) {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  const shouldShowToast = () => {
    return hasSavedInSession.current || hasPendingChanges.current;
  };

  const hasSaveableState = () => {
    return currentMovesRef.current.length > 0 || hasPendingChanges.current;
  };

  // The game's status must be read from the ref at decision time, not captured
  // when the effect mounts: these effects run once (stable `saveGame`), so a
  // captured value would still say "in progress" after the game ends — and the
  // unmount cleanup would flag a "game saved" toast on the page the player
  // navigates to from an already-finished game (e.g. finish modal → Kata).
  const isCurrentGameFinished = () => isGameFinished(currentStatusRef.current);

  // Auto-save on page visibility change and show notification when navigating away
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && hasSaveableState() && !isCurrentGameFinished()) {
        if (hasPendingChanges.current) {
          await saveGame(false);
        }

        if (shouldShowToast()) {
          writeSessionItem(SESSION_STORAGE_KEYS.SHOW_SAVE_TOAST, 'true');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup intentionally reads ref.current at unmount time to get the latest values.
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (hasSaveableState() && !isCurrentGameFinished()) {
        // eslint-disable-next-line react-hooks/exhaustive-deps -- reading the ref at cleanup time is the point: the unmount-time (latest) pending flag decides the final save, not a value captured at mount
        if (hasPendingChanges.current) {
          saveGame(false);
        }

        if (shouldShowToast()) {
          writeSessionItem(SESSION_STORAGE_KEYS.SHOW_SAVE_TOAST, 'true');
        }
      }
    };
  }, [saveGame]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasPlayerInteracted.current && hasSaveableState()) {
        // `silent`: this listener can fire synchronously inside a React render
        // when leaving for a different root layout (e.g. `/`). A plain save
        // would `setState` during render and trip React's warning — persist
        // only, since the save status UI is moot on an unloading page.
        saveGame(false, { silent: true });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveGame]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect pathname changes (navigation)
  useEffect(() => {
    if (pathname !== previousPathname.current && previousPathname.current) {
      if (
        hasSaveableState() &&
        (hasSavedInSession.current || hasPendingChanges.current) &&
        !isCurrentGameFinished()
      ) {
        writeSessionItem(SESSION_STORAGE_KEYS.SHOW_SAVE_TOAST, 'true');
      }
    }

    previousPathname.current = pathname;
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
}
