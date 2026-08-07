import { useMemo } from 'react';

import { getStartingFen, validateMoveSequence } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import { type EngineConfig, engineConfigFromUrlParams } from '@/lib/engines';
import { normalisePerGamePreferences } from '@/lib/games/per-game-preferences';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type UrlParams = {
  playerSide: Side;
  engineConfig: EngineConfig;
  gameId: string | undefined;
  startingFen: string | undefined;
  urlMoves: string | null;
  gamePrefs: PerGamePreferences | undefined;
};

type ValidationErrorDetails = {
  invalidMove: string;
  invalidIndex: number;
  validMoves: AlgebraicNotation[];
  allMoves: AlgebraicNotation[];
};

type GameInitializationResult = {
  playerSide: Side;
  initialEngineConfig: EngineConfig;
  initialGameId: string | undefined;
  initialStartingFen: string | undefined;
  initialMovesFromUrl: AlgebraicNotation[];
  initialGamePrefs: PerGamePreferences | undefined;
  shouldRedirectToError: boolean;
  errorDetails: ValidationErrorDetails | null;
};

/**
 * Hook to parse and validate URL parameters for game initialization.
 *
 * Handles:
 * - URL parameter parsing (color, engine + difficulty, gameId, fen, moves)
 * - Move validation against chess rules
 * - Error detection for invalid moves (triggers redirect)
 */
export function useGameInitialization(urlParams: UrlParams): GameInitializationResult {
  return useMemo(() => {
    const { playerSide, engineConfig, gameId, startingFen, urlMoves, gamePrefs } = urlParams;

    // Get initial moves from URL and validate them
    let parsedMoves: AlgebraicNotation[] = [];
    if (urlMoves) {
      try {
        parsedMoves = JSON.parse(urlMoves);
      } catch {
        // Invalid JSON in URL, ignore
      }
    }

    // Validate moves if we don't have a gameId (gameId takes precedence)
    // When gameId is present, moves will be loaded from localStorage with the correct startingFen
    let initialMovesFromUrl: AlgebraicNotation[] = parsedMoves;
    let shouldRedirectToError = false;
    let errorDetails: ValidationErrorDetails | null = null;

    if (parsedMoves.length > 0 && !gameId) {
      const fen = startingFen ?? getStartingFen();
      const result = validateMoveSequence(fen, parsedMoves);

      if (result.valid) {
        initialMovesFromUrl = result.validMoves;
      } else {
        const validMoves = result.validMoves;
        const invalidIndex = validMoves.length;
        const invalidMove = parsedMoves[invalidIndex];

        console.warn(`Invalid move detected in URL: ${invalidMove} at index ${invalidIndex}`);
        shouldRedirectToError = true;
        errorDetails = {
          invalidMove,
          invalidIndex,
          validMoves,
          allMoves: parsedMoves,
        };
        initialMovesFromUrl = validMoves;
      }
    } else if (gameId) {
      // When gameId exists, don't use URL moves - they will be loaded from localStorage
      initialMovesFromUrl = [];
    }

    return {
      playerSide,
      initialEngineConfig: engineConfig,
      initialGameId: gameId,
      initialStartingFen: startingFen,
      initialMovesFromUrl,
      initialGamePrefs: gamePrefs,
      shouldRedirectToError,
      errorDetails,
    };
  }, [urlParams]);
}

/**
 * Parse URL search params into structured params object.
 * This is a pure function that can be called in the component.
 */
export function parseUrlSearchParams(searchParams: URLSearchParams): UrlParams {
  let gamePrefs: PerGamePreferences | undefined;
  const gamePrefsParam = searchParams.get('gamePrefs');
  if (gamePrefsParam) {
    try {
      // Run the parsed blob through the same normaliser used by the
      // localStorage repository so legacy `showBoardButtonInGame` and
      // missing-newer-field URLs behave like equivalent current ones.
      // Invalid enum values fall back to safe defaults instead of leaking
      // into a session and later being persisted as malformed data.
      gamePrefs = normalisePerGamePreferences(JSON.parse(gamePrefsParam));
    } catch {
      // Invalid JSON, ignore
    }
  }

  const colorParam = searchParams.get('color');
  const playerSide: Side = colorParam === 'white' || colorParam === 'black' ? colorParam : 'white';

  return {
    playerSide,
    engineConfig: engineConfigFromUrlParams(searchParams),
    gameId: searchParams.get('gameId') || undefined,
    startingFen: searchParams.get('fen') || undefined,
    urlMoves: searchParams.get('moves'),
    gamePrefs,
  };
}
