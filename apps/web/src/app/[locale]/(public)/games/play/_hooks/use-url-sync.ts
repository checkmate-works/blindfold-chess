import { useEffect } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import type { Side } from '@blindfold-chess/types';

import { type EngineConfig, engineConfigToUrlParams } from '@/lib/engines';

import type { Locale } from '@/app/[locale]/_lib/types';

import type { ValidationErrorDetails } from './use-game-initialization';

type UseUrlSyncOptions = {
  locale: Locale;
  gameId: string | undefined;
  initialGameId: string | undefined;
  playerSide: Side;
  engineConfig: EngineConfig;
  initialStartingFen: string | undefined;
  shouldRedirectToError: boolean;
  errorDetails: ValidationErrorDetails | null;
};

export function useUrlSync({
  locale,
  gameId,
  initialGameId,
  playerSide,
  engineConfig,
  initialStartingFen,
  shouldRedirectToError,
  errorDetails,
}: UseUrlSyncOptions) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Redirect to error page if invalid moves detected
  useEffect(() => {
    if (shouldRedirectToError && errorDetails) {
      const params = new URLSearchParams();
      params.set('invalidMove', errorDetails.invalidMove);
      params.set('invalidIndex', errorDetails.invalidIndex.toString());
      params.set('validMoves', JSON.stringify(errorDetails.validMoves));
      params.set('allMoves', JSON.stringify(errorDetails.allMoves));
      params.set('color', playerSide);
      for (const [key, value] of Object.entries(engineConfigToUrlParams(engineConfig))) {
        params.set(key, value);
      }

      if (initialStartingFen) {
        params.set('fen', initialStartingFen);
      }

      const effectiveGameId = initialGameId || gameId;
      if (effectiveGameId) {
        params.set('gameId', effectiveGameId);
      }

      router.replace(`/${locale}/games/play/error?${params.toString()}`);
    }
  }, [
    shouldRedirectToError,
    errorDetails,
    router,
    locale,
    playerSide,
    engineConfig,
    initialGameId,
    gameId,
    initialStartingFen,
  ]);

  // Update URL when gameId is generated
  useEffect(() => {
    if (gameId && !initialGameId) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('gameId', gameId);
      params.delete('moves');
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [gameId, initialGameId, searchParams, router]);

  return { router };
}
