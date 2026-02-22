import { useMemo } from 'react';

import { validateMoveSequence } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import type { SkillLevel } from '@/lib/types';

type UrlParams = {
  playerSide: Side;
  skillLevel: SkillLevel;
  gameId: string | undefined;
  startingFen: string | undefined;
  urlMoves: string | null;
};

type ValidationErrorDetails = {
  invalidMove: string;
  invalidIndex: number;
  validMoves: AlgebraicNotation[];
  allMoves: AlgebraicNotation[];
};

type GameInitializationResult = {
  playerSide: Side;
  initialSkillLevel: SkillLevel;
  initialGameId: string | undefined;
  initialStartingFen: string | undefined;
  initialMovesFromUrl: AlgebraicNotation[];
  shouldRedirectToError: boolean;
  errorDetails: ValidationErrorDetails | null;
};

/**
 * Hook to parse and validate URL parameters for game initialization.
 *
 * Handles:
 * - URL parameter parsing (color, skillLevel, gameId, fen, moves)
 * - Move validation against chess rules
 * - Error detection for invalid moves (triggers redirect)
 */
export function useGameInitialization(urlParams: UrlParams): GameInitializationResult {
  return useMemo(() => {
    const { playerSide, skillLevel, gameId, startingFen, urlMoves } = urlParams;

    // Get initial moves from URL and validate them
    const parsedMoves: AlgebraicNotation[] = urlMoves ? JSON.parse(urlMoves) : [];

    // Validate moves if we don't have a gameId (gameId takes precedence)
    // When gameId is present, moves will be loaded from localStorage with the correct startingFen
    let initialMovesFromUrl: AlgebraicNotation[] = parsedMoves;
    let shouldRedirectToError = false;
    let errorDetails: ValidationErrorDetails | null = null;

    if (parsedMoves.length > 0 && !gameId) {
      const fen = startingFen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const result = validateMoveSequence(fen, parsedMoves as string[]);

      if (result.valid) {
        initialMovesFromUrl = result.validMoves as AlgebraicNotation[];
      } else {
        const validMoves = result.validMoves as AlgebraicNotation[];
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
      initialSkillLevel: skillLevel,
      initialGameId: gameId,
      initialStartingFen: startingFen,
      initialMovesFromUrl,
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
  return {
    playerSide: (searchParams.get('color') as Side) || 'white',
    skillLevel: (parseInt(searchParams.get('skillLevel') || '5') as SkillLevel) || 5,
    gameId: searchParams.get('gameId') || undefined,
    startingFen: searchParams.get('fen') || undefined,
    urlMoves: searchParams.get('moves'),
  };
}
