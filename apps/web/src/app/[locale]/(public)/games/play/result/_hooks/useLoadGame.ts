'use client';

import { useEffect, useState } from 'react';

import { LocalStorageGameRepository } from '@/lib/games/local-storage-repository';
import type { Game } from '@/lib/games/saved-game-types';

type LoadGameErrorKind = 'missing-id' | 'not-found';

export type LoadGameState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: LoadGameErrorKind }
  | { status: 'loaded'; game: Game };

/**
 * Loads a game by ID from the local-storage repository and exposes a
 * discriminated state machine. Callers are expected to map `error` to
 * their own i18n strings.
 */
export function useLoadGame(gameId: string | null): LoadGameState {
  const [state, setState] = useState<LoadGameState>(
    gameId ? { status: 'loading' } : { status: 'error', error: 'missing-id' }
  );

  useEffect(() => {
    if (!gameId) {
      setState({ status: 'error', error: 'missing-id' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    (async () => {
      const repo = new LocalStorageGameRepository();
      const loadedGame = await repo.load(gameId);
      if (cancelled) return;
      if (!loadedGame) {
        setState({ status: 'error', error: 'not-found' });
      } else {
        setState({ status: 'loaded', game: loadedGame });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  return state;
}
