import { useMemo } from 'react';

import { isValidSkillLevel } from '@blindfold-chess/features/ai-game';
import {
  DEFAULT_MAIA_RATING,
  type MaiaRating,
  isMaiaRating,
} from '@blindfold-chess/features/ai-game/maia';
import { getStartingFen, validateMoveSequence } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';

import { DEFAULT_ENGINE, type EngineKind, isEngineKind } from '@/lib/engines';
import type { SkillLevel } from '@/lib/types';

import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type UrlParams = {
  playerSide: Side;
  skillLevel: SkillLevel;
  maiaRating: MaiaRating;
  engine: EngineKind;
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
  initialSkillLevel: SkillLevel;
  initialMaiaRating: MaiaRating;
  initialEngine: EngineKind;
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
 * - URL parameter parsing (color, skillLevel, gameId, fen, moves)
 * - Move validation against chess rules
 * - Error detection for invalid moves (triggers redirect)
 */
export function useGameInitialization(urlParams: UrlParams): GameInitializationResult {
  return useMemo(() => {
    const { playerSide, skillLevel, maiaRating, engine, gameId, startingFen, urlMoves, gamePrefs } =
      urlParams;

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
      initialMaiaRating: maiaRating,
      initialEngine: engine,
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
      gamePrefs = JSON.parse(gamePrefsParam);
    } catch {
      // Invalid JSON, ignore
    }
  }

  const colorParam = searchParams.get('color');
  const playerSide: Side = colorParam === 'white' || colorParam === 'black' ? colorParam : 'white';

  const parsedSkillLevel = parseInt(searchParams.get('skillLevel') || '5');
  const skillLevel: SkillLevel = isValidSkillLevel(parsedSkillLevel) ? parsedSkillLevel : 5;

  // Maia uses a separate `elo=` URL param drawn from the official 11-value
  // catalog. We never coerce the Stockfish `skillLevel` into a Maia rating
  // (or vice versa) — the two scales are domain-distinct, so a missing or
  // off-catalog `elo` simply falls back to the catalog mid-point.
  const parsedElo = parseInt(searchParams.get('elo') || '');
  const maiaRating: MaiaRating =
    Number.isFinite(parsedElo) && isMaiaRating(parsedElo) ? parsedElo : DEFAULT_MAIA_RATING;

  const engineParam = searchParams.get('engine');
  const engine: EngineKind = isEngineKind(engineParam) ? engineParam : DEFAULT_ENGINE;

  return {
    playerSide,
    skillLevel,
    maiaRating,
    engine,
    gameId: searchParams.get('gameId') || undefined,
    startingFen: searchParams.get('fen') || undefined,
    urlMoves: searchParams.get('moves'),
    gamePrefs,
  };
}
