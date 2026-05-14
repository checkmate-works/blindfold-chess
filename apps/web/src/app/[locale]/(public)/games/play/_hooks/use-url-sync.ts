import { useEffect } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import type { MaiaRating } from '@blindfold-chess/features/ai-game/maia';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import type { EngineKind } from '@/lib/engines';
import type { SkillLevel } from '@/lib/types';

import type { Locale } from '@/app/[locale]/_lib/types';

type ErrorDetails = {
  invalidMove: string;
  invalidIndex: number;
  validMoves: AlgebraicNotation[];
  allMoves: AlgebraicNotation[];
};

type UseUrlSyncOptions = {
  locale: Locale;
  gameId: string | undefined;
  initialGameId: string | undefined;
  playerSide: Side;
  skillLevel: SkillLevel;
  maiaRating: MaiaRating;
  engine: EngineKind;
  initialStartingFen: string | undefined;
  shouldRedirectToError: boolean;
  errorDetails: ErrorDetails | null;
};

export function useUrlSync({
  locale,
  gameId,
  initialGameId,
  playerSide,
  skillLevel,
  maiaRating,
  engine,
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
      if (engine === 'maia') {
        params.set('engine', 'maia');
        params.set('elo', maiaRating.toString());
      } else {
        params.set('skillLevel', skillLevel.toString());
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
    skillLevel,
    maiaRating,
    engine,
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
