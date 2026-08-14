import {
  fullmoveNumberFromFen,
  getStartingFen,
  getTurnFromFen,
} from '@blindfold-chess/features/chess-core';
import type { FinalGameOutcome, Side } from '@blindfold-chess/types';

import type { EngineKind } from '@/lib/engines';

import type { ReviewInput } from './input';

/**
 * Game facts the prompt states as context. Deliberately excludes every
 * author-editable string (title, description): the prompt's only free-form
 * inputs are SAN tokens validated by replay and server-derived numbers, which
 * closes the prompt-injection surface at the source.
 */
export type ReviewPromptMeta = {
  playerColor: Side;
  /** Outcome from the player's point of view. */
  result: FinalGameOutcome;
  engineKind: EngineKind;
  /** Unified approximate Elo (from `games.engine_elo`). */
  engineElo: number;
  /** Detected opening name, or null when unknown. */
  openingName: string | null;
  /** Target output language, as an English language name (see LOCALE_LANGUAGE). */
  language: string;
};

/** `SUPPORTED_LOCALES` → the English language name the prompt asks for. */
export const LOCALE_LANGUAGE: Record<string, string> = {
  en: 'English',
  ja: 'Japanese',
  es: 'Spanish',
  'pt-BR': 'Brazilian Portuguese',
};

/**
 * Render moves as a numbered SAN line ("1. e4 e5 2. Nf3 …"), honoring a
 * custom starting position's move number and side to move (a black-to-move
 * start renders "10... Nf6 11. …").
 */
export function buildMovetext(moves: string[], startingFen?: string | null): string {
  const fen = startingFen ?? getStartingFen();
  let moveNumber = fullmoveNumberFromFen(fen);
  let whiteToMove = getTurnFromFen(fen) === 'w';

  const parts: string[] = [];
  moves.forEach((san, i) => {
    if (whiteToMove) {
      parts.push(`${moveNumber}. ${san}`);
    } else {
      parts.push(i === 0 ? `${moveNumber}... ${san}` : san);
      moveNumber += 1;
    }
    whiteToMove = !whiteToMove;
  });
  return parts.join(' ');
}

/**
 * The coach persona and the hard rules. The engine-authority rules are
 * defense-in-depth — the output schema already has no numeric/move fields
 * (see `./schema`) — but they also steer the prose away from second-guessing
 * the provided evaluations in words.
 */
export function buildSystemPrompt(language: string): string {
  return [
    'You are an experienced, encouraging chess coach writing a post-game review for your student (the player).',
    '',
    'Hard rules:',
    '- The provided Stockfish evaluations, centipawn losses, best moves, and move classifications are ground truth. Never contradict them, never estimate your own evaluations, and never suggest a "best move" other than the one provided for that position.',
    '- Only discuss the critical moments listed in the input. Do not invent analysis of other moves.',
    '- Address the player directly ("you"), in a constructive, specific tone. Explain ideas (piece activity, king safety, pawn structure, tactics) rather than restating numbers.',
    '- Keep each explanation and lesson to 2-3 sentences. Keep the summary to 3-5 sentences.',
    `- Write ALL output text in ${language}. Keep chess move notation (SAN) as-is.`,
    '- Fill the JSON schema exactly. Every momentComments entry must reference one of the listed plies.',
  ].join('\n');
}

/** The per-game facts block the model reviews. */
export function buildUserPrompt(
  meta: ReviewPromptMeta,
  movetext: string,
  input: ReviewInput
): string {
  const engineLabel = meta.engineKind === 'maia' ? `Maia (rating ${meta.engineElo})` : 'Stockfish';

  return [
    `Player color: ${meta.playerColor}`,
    `Result for the player: ${meta.result}`,
    `Opponent: ${engineLabel} (approximate Elo ${meta.engineElo})`,
    `Opening: ${meta.openingName ?? 'unknown'}`,
    '',
    'Moves:',
    movetext,
    '',
    "Critical moments (Stockfish ground truth; evals in centipawns from White's perspective; cpLoss is what the mover threw away):",
    JSON.stringify(input.moments),
    '',
    "Player's aggregate stats:",
    JSON.stringify(input.summaryStats),
  ].join('\n');
}
