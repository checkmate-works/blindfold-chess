import {
  fullmoveNumberFromFen,
  getStartingFen,
  getTurnFromFen,
} from '@blindfold-chess/features/chess-core';
import type { FinalGameOutcome, Side } from '@blindfold-chess/types';

import type { EngineKind } from '@/lib/engines';
import type { GamePlaySettings } from '@/lib/games/saved-game-types';

import type { BlindfoldContext } from './blindfold-context';
import type { ReviewInput } from './input';
import { REVIEW_LIST_BOUNDS } from './schema';

/**
 * Game facts the prompt states as context. Deliberately excludes every
 * author-editable string (title, description): the prompt's only free-form
 * inputs are SAN tokens validated by replay and server-derived numbers, which
 * closes the prompt-injection surface at the source. The blindfold block
 * keeps to the same rule: its free text is limited to move-shaped rejected
 * attempts (see `buildBlindfoldContext`).
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
 * What the app's aid vocabulary means, for a model that has never seen this
 * app. Stated once, in the system prompt, so the per-game facts can use the
 * bare words.
 */
const BLINDFOLD_VOCABULARY = [
  'Vocabulary of the blindfold conditions:',
  '- "peek": revealing the hidden board on demand, then hiding it again.',
  '- "hint": displaying the legal moves of a piece.',
  '- "takeback": undoing a move and playing another.',
  '- "rejected move": a move the player submitted that was illegal in the actual position. In blindfold play this is the clearest evidence that the player\'s mental picture of the position had drifted from the real one.',
  '- Signals are server-derived tags: "board_image_drift" = two or more rejected moves right before the move; "played_with_aid" = the move was chosen after a peek or a hint, i.e. with sight; "retried" = the player took back and re-played before settling on it.',
];

/**
 * Coaching rules that apply only when the game was played under a blindfold
 * constraint. The per-mode block is keyed on the start-of-game board
 * visibility, because that is what decides which skill the game trained:
 * holding a picture with no sight at all, spending peeks well, or tracking
 * piece identity on a board that is visible but disguised.
 */
function blindfoldCoachingRules(start: GamePlaySettings): string[] {
  const common = [
    'This game was played under blindfold conditions (stated in the input). Coach it as one:',
    '- Separate sight failures from chess failures. A mistake preceded by rejected moves, a takeback, or made by a piece that was not where the player thought, is a lapse in holding the position — coach the visualization (re-verifying piece locations after captures and pawn moves, periodically recounting the full position, naming the squares around both kings) and not only the tactic.',
    '- A mistake made right after a peek or a hint ("played_with_aid") was made with sight. Treat it as a chess error and do not blame memory for it.',
    '- Aid usage is information, never something to scold. Mention it only where it explains a moment or shapes a lesson.',
    '- Never claim the player saw, or could not see, anything beyond what the stated conditions and signals say.',
    "- The per-move aid counts are exact for that move, and the game-wide totals say nothing about which moves they belong to. Never attribute a peek, hint, or takeback to a critical moment unless that moment's own line shows it; a peek that the totals count but no moment line shows happened at some other move.",
    '- If the input says accuracy fell off in the second half, say so and offer a way to keep the picture fresh in long games.',
  ];
  const byMode: Record<GamePlaySettings['boardVisibility'], string[]> = {
    never: [
      '- The board was never shown: every move was played from memory. Give at least one lesson on maintaining the mental board, and praise clean stretches of play explicitly.',
    ],
    peek: [
      '- The board was hidden but could be peeked. Frame peeks as checkpoints spent at structural changes (captures, pawn breaks, king moves) rather than per move, and suggest where in this game a checkpoint would have paid off.',
    ],
    always: [
      '- The board was visible but disguised (hidden pieces, pieces drawn alike, or in one colour). The skill trained is tracking which piece is which; coach that tracking where a moment shows it slipping.',
    ],
  };
  return [...common, ...byMode[start.boardVisibility]];
}

/** "1-3" — the bounds as the prompt states them. */
function range({ min, max }: { min: number; max: number }): string {
  return `${min}-${max}`;
}

/**
 * The coach persona and the hard rules. The engine-authority rules are
 * defense-in-depth — the output schema already has no numeric/move fields
 * (see `./schema`) — but they also steer the prose away from second-guessing
 * the provided evaluations in words.
 *
 * The blindfold rules are appended only when `blindfold` is present: a game
 * played fully sighted, or one whose conditions were not recorded, must not
 * be coached as a blindfold game (see `buildBlindfoldContext`).
 */
export function buildSystemPrompt(language: string, blindfold: BlindfoldContext | null): string {
  const lines = [
    'You are an experienced, encouraging chess coach writing a post-game review for your student (the player).',
    '',
    'Hard rules:',
    '- The provided Stockfish evaluations, centipawn losses, best moves, and move classifications are ground truth. Never contradict them, never estimate your own evaluations, and never suggest a "best move" other than the one provided for that position.',
    '- Only discuss the critical moments listed in the input. Do not invent analysis of other moves.',
    '- Address the player directly ("you"), in a constructive, specific tone. Explain ideas (piece activity, king safety, pawn structure, tactics) rather than restating numbers.',
    '- Keep each explanation and lesson to 2-3 sentences.',
    '- The summary is a TL;DR: 3-4 bullet points of one sentence each — how the game went, what decided it, and the single most important thing to work on. No preamble; the sections that follow carry the detail.',
    `- Write ALL output text in ${language}. Keep chess move notation (SAN) as-is.`,
    '- Fill the JSON schema exactly. Every momentComments entry must reference one of the listed plies.',
    `- List sizes are hard limits: strengths ${range(REVIEW_LIST_BOUNDS.strengths)} items, weaknesses ${range(REVIEW_LIST_BOUNDS.weaknesses)}, advice ${range(REVIEW_LIST_BOUNDS.advice)}, summary ${range(REVIEW_LIST_BOUNDS.summary)}. Merge points rather than exceed a limit.`,
  ];
  if (blindfold) {
    lines.push('', ...BLINDFOLD_VOCABULARY, '', ...blindfoldCoachingRules(blindfold.start));
  }
  return lines.join('\n');
}

/** The start-of-game conditions as one sentence of plain facts. */
function describeStartConditions(s: GamePlaySettings): string {
  const parts: string[] = [];
  parts.push(
    {
      never: 'board hidden for the whole game (never shown)',
      peek: 'board hidden, could be peeked on demand',
      always: 'board shown',
    }[s.boardVisibility]
  );
  if (!s.showOwnPieces) parts.push('own pieces hidden');
  if (!s.showOpponentPieces) parts.push('opponent pieces hidden');
  if (s.pieceShapeMode !== 'normal') {
    const who = { 'circles-all': 'all', 'circles-own': 'own', 'circles-opponent': 'opponent' }[
      s.pieceShapeMode
    ];
    parts.push(`${who} pieces drawn as identical stones (type not visible)`);
  }
  if (s.pieceColors !== 'normal') {
    parts.push(
      `all pieces drawn ${s.pieceColors === 'white-only' ? 'white' : 'black'} (side not visible)`
    );
  }
  if (s.pawnHideMode !== 'none') {
    parts.push(`${s.pawnHideMode} pawns hidden`);
  }
  return parts.join('; ');
}

/**
 * The blindfold facts block: the conditions, the game-wide aid usage, and
 * the aid usage at each critical moment (as JSON lines, like the moments
 * themselves). Numbers and move-shaped tokens only — see
 * `buildBlindfoldContext` for why the rejected-move texts are filtered.
 */
function describeBlindfold(b: BlindfoldContext): string[] {
  const lines = ['Blindfold conditions:', `- At the start: ${describeStartConditions(b.start)}.`];
  if (b.changedMidGame) {
    lines.push(
      '- Display settings were changed during the game; each moment below states the board visibility in force at that move.'
    );
  }
  lines.push(
    `- Aid used over the whole game: peeks ${b.totals.peeks}, hints ${b.totals.hints}, takebacks ${b.totals.undos}, rejected moves ${b.totals.illegalAttempts}.`
  );
  if (b.erasedByUndo) {
    const e = b.erasedByUndo;
    if (e.peeks + e.hints + e.illegalAttempts > 0) {
      lines.push(
        `- Of which removed from the per-move record by takebacks (the player peeked, consulted a hint, or had a move rejected, then took the move back): peeks ${e.peeks}, hints ${e.hints}, rejected moves ${e.illegalAttempts}.`
      );
    }
  }
  if (b.lateGameDecline) {
    lines.push("- The player's accuracy fell off markedly in the second half of their moves.");
  }
  if (b.moments.length > 0) {
    lines.push(
      '',
      'Aid usage while choosing each critical move (ply matches the critical moments; "visibility" is the board visibility at that move):',
      ...b.moments.map((m) =>
        JSON.stringify({
          ply: m.ply,
          visibility: m.visibility,
          peeks: m.aid.peeks,
          hints: m.aid.hints,
          takebacks: m.aid.undos,
          rejectedMoves: m.rejectedMoves,
          rejectedMoveCount: m.aid.illegalAttempts,
          signals: m.signals,
        })
      )
    );
  }
  return lines;
}

/** The per-game facts block the model reviews. */
export function buildUserPrompt(
  meta: ReviewPromptMeta,
  movetext: string,
  input: ReviewInput,
  blindfold: BlindfoldContext | null
): string {
  const engineLabel = meta.engineKind === 'maia' ? `Maia (rating ${meta.engineElo})` : 'Stockfish';

  return [
    `Player color: ${meta.playerColor}`,
    `Result for the player: ${meta.result}`,
    `Opponent: ${engineLabel} (approximate Elo ${meta.engineElo})`,
    `Opening: ${meta.openingName ?? 'unknown'}`,
    ...(blindfold ? ['', ...describeBlindfold(blindfold)] : []),
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
