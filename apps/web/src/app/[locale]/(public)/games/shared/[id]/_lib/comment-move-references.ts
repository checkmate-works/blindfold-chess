import {
  getFenAfterMoves,
  getStartingFen,
  validateMoveSequence,
} from '@blindfold-chess/features/chess-core';

import { parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';

/**
 * A slice of comment text: either plain text or a run of PGN-style move
 * references (e.g. "8. Bd3 Bb7 9. O-O") that were verified against the
 * game's actual moves and can be replayed from `basePly`.
 */
export type CommentTextSegment =
  | { type: 'text'; value: string }
  | { type: 'moveRef'; raw: string; basePly: number; sans: string[]; baseFen: string };

const SAN_RE = /^(?:O-O-O|O-O|(?:[KQRBN])?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)[+#]?$/;
const BARE_ANCHOR_RE = /^\d+\.{1,3}$/;
const LEADING_ANCHOR_RE = /^\d+\.{1,3}/;
/**
 * A run-opening "N." / "N..." label. The lookbehind confines matches to word
 * starts (start of text, after whitespace, or after an opening bracket/quote
 * or CJK delimiter) so a digits-dot sequence inside a longer token — most
 * importantly inside a pasted URL like ".../study/abc/8.Bd3" — is never
 * carved out of it, which would corrupt the URL linkification of the
 * surrounding text. Digits and dots are captured separately: deriving the dot
 * count from the matched length minus `String(parseInt(...)).length` breaks
 * on zero-padded numbers ("08." would count 2 dots and read as a black move).
 */
const ANCHOR_RE = /(?<=^|[\s([{'"「『（、。])(\d+)(\.{1,3})/g;
const WORD_RE = /\S+/y;

/**
 * Inverse of `computeMoveNumber` (practice/recall's ply -> {moveNumber,
 * isWhiteMove} formula): given a parsed "N." / "N..." reference, find the
 * 0-based ply it names. Returns -1 when the combination cannot occur (e.g. a
 * white-move reference numbered before the game's first move).
 */
export function plyFromMoveNumber(
  moveNumber: number,
  isWhiteMove: boolean,
  startsAsBlack: boolean,
  startMoveNumber: number
): number {
  const k = moveNumber - startMoveNumber;
  if (k < 0) return -1;

  const ply = startsAsBlack ? (isWhiteMove ? 2 * k - 1 : 2 * k) : isWhiteMove ? 2 * k : 2 * k + 1;

  return ply < 0 ? -1 : ply;
}

type CandidateToken = { san: string; endOffset: number };

/**
 * Walk whitespace-separated words starting at `startOffset`, collecting SAN
 * tokens for as long as they keep looking like moves. Tolerates an
 * interleaved move-number label before a later move ("9." or the glued
 * "9.O-O") since consecutive-move references repeat that label per PGN
 * convention. Stops at the first word that isn't a move-number label nor a
 * SAN-shaped token.
 */
function collectCandidates(text: string, startOffset: number): CandidateToken[] {
  const tokens: CandidateToken[] = [];
  let cursor = startOffset;

  while (cursor < text.length) {
    while (cursor < text.length && /\s/.test(text[cursor])) cursor++;
    if (cursor >= text.length) break;

    WORD_RE.lastIndex = cursor;
    const wordMatch = WORD_RE.exec(text);
    if (!wordMatch) break;

    const word = wordMatch[0];
    const wordStart = cursor;

    if (BARE_ANCHOR_RE.test(word)) {
      cursor = wordStart + word.length;
      continue;
    }

    const glued = LEADING_ANCHOR_RE.exec(word);
    const sanOffsetWithinWord = glued ? glued[0].length : 0;
    const sanCandidate = glued ? word.slice(glued[0].length) : word;
    const stripped = sanCandidate.replace(/,+$/, '');

    if (!stripped || !SAN_RE.test(stripped)) break;

    tokens.push({ san: stripped, endOffset: wordStart + sanOffsetWithinWord + stripped.length });
    cursor = wordStart + word.length;
  }

  return tokens;
}

/**
 * Split free-form comment text into plain-text and move-reference segments.
 * A move reference is a "N." / "N..." label followed by one or more SAN
 * moves that are verified legal when replayed from the game's actual moves
 * up to that ply — this is what lets a suggested alternative like "8. Bd3"
 * (the game's real 8th move was "Bb5") branch off correctly instead of
 * requiring the reference to match what was actually played.
 *
 * Consecutive moves ("8. Bd3 Bb7 9. O-O") are fused into a single segment;
 * an illegal move anywhere in the run truncates the segment at the last
 * legal move (or drops it entirely if the very first move is illegal).
 * References to a ply beyond the game's recorded moves are left as plain
 * text — there is no real prior position to branch from.
 */
export function parseCommentMoveReferences(
  text: string,
  moves: readonly string[],
  startingFen: string | null
): CommentTextSegment[] {
  const segments: CommentTextSegment[] = [];
  const { startsAsBlack, startMoveNumber } = parseFenMeta(startingFen);
  let cursor = 0;
  let match: RegExpExecArray | null;

  ANCHOR_RE.lastIndex = 0;
  while ((match = ANCHOR_RE.exec(text))) {
    if (match.index < cursor) continue;

    const moveNumber = parseInt(match[1], 10);
    const isWhiteMove = match[2].length === 1;

    const tokens = collectCandidates(text, match.index + match[0].length);
    if (tokens.length === 0) continue;

    const basePly = plyFromMoveNumber(moveNumber, isWhiteMove, startsAsBlack, startMoveNumber);
    if (basePly < 0 || basePly > moves.length) continue;

    let baseFen: string;
    try {
      baseFen = getFenAfterMoves(startingFen ?? getStartingFen(), moves.slice(0, basePly));
    } catch {
      continue;
    }

    const { validMoves } = validateMoveSequence(
      baseFen,
      tokens.map((t) => t.san)
    );
    if (validMoves.length === 0) continue;

    const rawEnd = tokens[validMoves.length - 1].endOffset;
    if (match.index > cursor) {
      segments.push({ type: 'text', value: text.slice(cursor, match.index) });
    }
    segments.push({
      type: 'moveRef',
      raw: text.slice(match.index, rawEnd),
      basePly,
      sans: validMoves,
      baseFen,
    });
    cursor = rawEnd;
  }

  if (cursor < text.length) {
    segments.push({ type: 'text', value: text.slice(cursor) });
  }

  return segments;
}
