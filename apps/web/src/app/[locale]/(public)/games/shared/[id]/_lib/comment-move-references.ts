import { replayMoves, validateMoveSequence } from '@blindfold-chess/features/chess-core';

import { parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';
import { computeMoveNumber } from '@/app/[locale]/(public)/practice/(free-play)/recall/_lib/compute-move-number';

/**
 * A slice of comment text: either plain text or a run of PGN-style move
 * references (e.g. "8. Bd3 Bb7 9. O-O") that were verified against the
 * game's actual moves and can be replayed from `basePly`.
 */
export type CommentTextSegment =
  | { type: 'text'; value: string }
  | { type: 'moveRef'; raw: string; basePly: number; sans: string[]; baseFen: string };

const SAN_RE = /^(?:O-O-O|O-O|(?:[KQRBN])?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)[+#]?$/;
const BARE_ANCHOR_RE = /^(\d+)(\.{1,3})$/;
const LEADING_ANCHOR_RE = /^(\d+)(\.{1,3})/;
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
 * Sentence punctuation and annotation glyphs tolerated after a SAN token
 * ("8. Bd3!", "…was 3. Bc4.", "(3. Bc4)"). Stripped before the SAN shape
 * test and excluded from the linked range, so the glyphs stay in the
 * following plain-text segment. `+`/`#` are deliberately absent — they are
 * part of SAN itself (check / mate suffixes).
 */
const TRAILING_GLYPHS_RE = /[),.;:!?\]}'"、。）」』]+$/;

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

type LabelContext = {
  basePly: number;
  startsAsBlack: boolean;
  startMoveNumber: number;
};

/**
 * Whether an interleaved "N." / "N..." label agrees with the move the run's
 * next token would occupy (`basePly + collected`). A label claiming a
 * different move number or color means the writer started a NEW reference
 * ("8. Bd3 Bb7 15. O-O"), so the current run must stop rather than absorb
 * it — a fused link would otherwise replay that move at a ply the text never
 * claimed. The stopped-at label is then re-scanned as its own anchor.
 */
function labelAgrees(digits: string, dots: string, ctx: LabelContext, collected: number): boolean {
  const { moveNumber, isWhiteMove } = computeMoveNumber(
    ctx.basePly + collected,
    ctx.startsAsBlack,
    ctx.startMoveNumber
  );
  return parseInt(digits, 10) === moveNumber && (dots.length === 1) === isWhiteMove;
}

/**
 * Walk whitespace-separated words starting at `startOffset`, collecting SAN
 * tokens for as long as they keep looking like moves. Tolerates an
 * interleaved move-number label before a later move ("9." or the glued
 * "9.O-O") since consecutive-move references repeat that label per PGN
 * convention — but only when the label agrees with the ply the run has
 * reached (see {@link labelAgrees}). Stops at the first word that isn't an
 * agreeing move-number label nor a SAN-shaped token.
 */
function collectCandidates(text: string, startOffset: number, ctx: LabelContext): CandidateToken[] {
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

    const bare = BARE_ANCHOR_RE.exec(word);
    if (bare) {
      if (!labelAgrees(bare[1], bare[2], ctx, tokens.length)) break;
      cursor = wordStart + word.length;
      continue;
    }

    const glued = LEADING_ANCHOR_RE.exec(word);
    if (glued && !labelAgrees(glued[1], glued[2], ctx, tokens.length)) break;
    const sanOffsetWithinWord = glued ? glued[0].length : 0;
    const sanCandidate = glued ? word.slice(glued[0].length) : word;
    const stripped = sanCandidate.replace(TRAILING_GLYPHS_RE, '');

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
  // One replay of the whole game serves every anchor in the comment
  // (positions[p] = FEN before the move at ply p). Computed lazily on the
  // first in-range anchor so comments without references never touch
  // chess.js.
  let positions: ReturnType<typeof replayMoves> | undefined;
  let cursor = 0;
  let match: RegExpExecArray | null;

  ANCHOR_RE.lastIndex = 0;
  while ((match = ANCHOR_RE.exec(text))) {
    if (match.index < cursor) continue;

    const moveNumber = parseInt(match[1], 10);
    const isWhiteMove = match[2].length === 1;

    const basePly = plyFromMoveNumber(moveNumber, isWhiteMove, startsAsBlack, startMoveNumber);
    if (basePly < 0 || basePly > moves.length) continue;

    const tokens = collectCandidates(text, match.index + match[0].length, {
      basePly,
      startsAsBlack,
      startMoveNumber,
    });
    if (tokens.length === 0) continue;

    positions ??= replayMoves([...moves], startingFen ?? undefined);
    // Shorter than moves.length + 1 only if the stored game itself failed to
    // replay — no trustworthy position to branch from, so leave it as text.
    const baseFen = positions[basePly]?.fen;
    if (!baseFen) continue;

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
