import { replayMoves, validateMoveSequence } from '@blindfold-chess/features/chess-core';
import { plyFromMoveNumber } from '@blindfold-chess/features/chess-core/move-numbering';

import { collectCandidates } from '@/lib/move-references/tokenizer';

import { parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';

/**
 * A slice of comment text: either plain text or a run of PGN-style move
 * references (e.g. "8. Bd3 Bb7 9. O-O") that were verified against the
 * game's actual moves and can be replayed from `basePly`.
 */
export type CommentTextSegment =
  | { type: 'text'; value: string }
  | { type: 'moveRef'; raw: string; basePly: number; sans: string[]; baseFen: string };

/**
 * A run-opening "N." / "N..." label. The lookbehind confines matches to word
 * starts (start of text, after whitespace, or after an opening bracket/quote
 * or CJK delimiter) so a digits-dot sequence inside a longer token — most
 * importantly inside a pasted URL like ".../study/abc/8.Bd3" — is never
 * carved out of it, which would corrupt the URL linkification of the
 * surrounding text. Digits and dots are captured separately: deriving the dot
 * count from the matched length minus `String(parseInt(...)).length` breaks
 * on zero-padded numbers ("08." would count 2 dots and read as a black move).
 *
 * The SAN shape test, the trailing-glyph tolerance and the interleaved-label
 * agreement check all live in `@/lib/move-references/tokenizer`, shared with
 * the single-position parser.
 */
const ANCHOR_RE = /(?<=^|[\s([{'"「『（、。])(\d+)(\.{1,3})/g;

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
