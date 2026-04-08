import { useEffect, useRef } from 'react';

import { usePathname } from 'next/navigation';

import type { AlgebraicNotation } from '@blindfold-chess/types';

import { isGameFinished } from '../_lib/game-utils';
import { SESSION_STORAGE_KEYS } from '../_lib/session-storage-keys';

type UseAutoSaveEventsOptions = {
  saveGame: (showNotification?: boolean) => Promise<string | undefined> | undefined;
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

  // Auto-save on page visibility change and show notification when navigating away
  useEffect(() => {
    const gameFinished = isGameFinished(currentStatusRef.current);

    const handleVisibilityChange = async () => {
      if (document.hidden && currentMovesRef.current.length > 0 && !gameFinished) {
        if (hasPendingChanges.current) {
          await saveGame(false);
        }

        if (shouldShowToast()) {
          sessionStorage.setItem(SESSION_STORAGE_KEYS.SHOW_SAVE_TOAST, 'true');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup intentionally reads ref.current at unmount time to get the latest values.
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: read latest ref at unmount
      if (currentMovesRef.current.length > 0 && !gameFinished) {
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: read latest ref at unmount
        if (hasPendingChanges.current) {
          saveGame(false);
        }

        if (shouldShowToast()) {
          sessionStorage.setItem(SESSION_STORAGE_KEYS.SHOW_SAVE_TOAST, 'true');
        }
      }
    };
  }, [saveGame]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasPlayerInteracted.current && currentMovesRef.current.length > 0) {
        saveGame(false);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveGame]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect pathname changes (navigation)
  useEffect(() => {
    const gameFinished = isGameFinished(currentStatusRef.current);

    if (pathname !== previousPathname.current && previousPathname.current) {
      if (
        currentMovesRef.current.length > 0 &&
        (hasSavedInSession.current || hasPendingChanges.current) &&
        !gameFinished
      ) {
        sessionStorage.setItem(SESSION_STORAGE_KEYS.SHOW_SAVE_TOAST, 'true');
      }
    }

    previousPathname.current = pathname;
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
}
