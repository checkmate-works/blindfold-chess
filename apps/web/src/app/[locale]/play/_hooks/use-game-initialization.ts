import { useMemo } from 'react';

import type { AlgebraicNotation, Side } from '@blindfold-chess/types';
import { Chess } from 'chess.js';

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
      const validMoves: AlgebraicNotation[] = [];
      // Initialize with custom FEN or standard starting position
      const chess = startingFen ? new Chess(startingFen) : new Chess();

      for (let i = 0; i < parsedMoves.length; i++) {
        const move = parsedMoves[i];
        try {
          const result = chess.move(move);
          if (result) {
            validMoves.push(move as AlgebraicNotation);
          } else {
            // Invalid move found - log warning instead of throwing error
            console.warn(`Invalid move detected in URL: ${move} at index ${i}`);
            shouldRedirectToError = true;
            errorDetails = {
              invalidMove: move,
              invalidIndex: i,
              validMoves,
              allMoves: parsedMoves,
            };
            break;
          }
        } catch (error) {
          // Error processing move - log warning instead of throwing error
          console.warn(`Error processing move from URL: ${move} at index ${i}`, error);
          shouldRedirectToError = true;
          errorDetails = {
            invalidMove: move,
            invalidIndex: i,
            validMoves,
            allMoves: parsedMoves,
          };
          break;
        }
      }

      initialMovesFromUrl = validMoves;
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
