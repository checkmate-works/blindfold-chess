import { type MaiaRating, isMaiaRating } from '@blindfold-chess/features/ai-game/maia';
import { formatMovesToPgn, formatPgnToText } from '@blindfold-chess/features/chess-core/pgn-format';
import type { Side } from '@blindfold-chess/types';

import { type EngineKind, isEngineKind } from '@/lib/engines';
import type { SkillLevel } from '@/lib/games/saved-game-types';

import { parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';

export type InitialPgnState = {
  pgn: string;
  color: Side | null;
  skillLevel: SkillLevel | null;
  maiaRating: MaiaRating | null;
  engine: EngineKind | null;
};

/**
 * Pure derivation of the initial PgnGameForm state from URL search params.
 * Replaces the previous `useEffect` → `setState` pattern so state is
 * materialised once during `useState` initialization.
 */
export function deriveInitialPgnState(searchParams: URLSearchParams): InitialPgnState {
  const urlMoves = searchParams.get('moves');
  const urlColor = searchParams.get('color') as Side | null;
  const urlSkillLevel = searchParams.get('skillLevel');
  const urlFen = searchParams.get('fen');

  let pgn = '';
  if (urlMoves) {
    try {
      const movesArray = JSON.parse(urlMoves) as string[];
      if (movesArray.length > 0) {
        // The movetext has to be numbered from the same position the `[FEN]`
        // header names, or the two halves of this PGN contradict each other:
        // numbering by hand from 1 turned a game resumed at move 24 with Black
        // to move into `[FEN "... b ... 24"]` followed by `1. <black move>`.
        const { startsAsBlack, startMoveNumber } = parseFenMeta(urlFen);
        pgn = formatPgnToText(
          formatMovesToPgn(movesArray, startsAsBlack, startMoveNumber),
          urlFen ?? undefined
        );
      }
    } catch (error) {
      console.error('Failed to parse moves from URL:', error);
    }
  }

  let color: Side | null = null;
  if (urlColor === 'white' || urlColor === 'black') {
    color = urlColor;
  }

  let skillLevel: SkillLevel | null = null;
  if (urlSkillLevel) {
    const level = parseInt(urlSkillLevel);
    if (level >= 1 && level <= 20) {
      skillLevel = level as SkillLevel;
    }
  }

  let maiaRating: MaiaRating | null = null;
  const urlElo = searchParams.get('elo');
  if (urlElo) {
    const parsed = parseInt(urlElo);
    if (Number.isFinite(parsed) && isMaiaRating(parsed)) {
      maiaRating = parsed;
    }
  }

  const urlEngine = searchParams.get('engine');
  const engine: EngineKind | null = urlEngine && isEngineKind(urlEngine) ? urlEngine : null;

  return { pgn, color, skillLevel, maiaRating, engine };
}
