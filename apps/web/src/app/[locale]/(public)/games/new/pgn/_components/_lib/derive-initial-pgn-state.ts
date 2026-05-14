import { type MaiaRating, isMaiaRating } from '@blindfold-chess/features/ai-game/maia';
import type { Side } from '@blindfold-chess/types';

import { type EngineKind, isEngineKind } from '@/lib/engines';
import type { SkillLevel } from '@/lib/types';

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
        const pgnParts: string[] = [];

        if (urlFen) {
          pgnParts.push(`[SetUp "1"]`);
          pgnParts.push(`[FEN "${urlFen}"]`);
          pgnParts.push('');
        }

        for (let i = 0; i < movesArray.length; i += 2) {
          const moveNumber = Math.floor(i / 2) + 1;
          const whiteMove = movesArray[i];
          const blackMove = movesArray[i + 1];
          if (blackMove) {
            pgnParts.push(`${moveNumber}. ${whiteMove} ${blackMove}`);
          } else {
            pgnParts.push(`${moveNumber}. ${whiteMove}`);
          }
        }
        pgn = pgnParts.join(urlFen ? '\n' : ' ');
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
