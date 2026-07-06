import { validateMoveSequence } from '@blindfold-chess/features/chess-core';

/**
 * A slice of comment text: either plain text or a run of SAN moves
 * (e.g. "Bxa7 b6") that were verified legal from a single base position and
 * can be replayed from it.
 *
 * Unlike the game-comment references (`comment-move-references.ts`), there is
 * no "N." move-number anchor here: a chunk comment is written against ONE
 * position (the chunk's representative FEN), so there is nothing to locate —
 * the branch always starts from that FEN. Move numbers, ply math, and PGN
 * replay are therefore unnecessary; a run is just a bare sequence of SAN.
 */
export type FenMoveSegment =
  | { type: 'text'; value: string }
  | { type: 'moveRef'; raw: string; sans: string[] };

/**
 * SAN for any single move, including a bare pawn push ("b6") and promotions.
 * Used to EXTEND a run once it has opened. Mirrors the games parser's SAN_RE.
 */
const SAN_RE = /^(?:O-O-O|O-O|(?:[KQRBN])?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)[+#]?$/;

/**
 * A run OPENER: only "move-like" SAN — a piece move (starts with KQRBN), a
 * capture (contains `x`, including pawn captures), or castling. A bare pawn
 * push ("b6", "e4") is deliberately NOT allowed to OPEN a run: chunk comments
 * routinely name squares in prose ("the b6 square is weak"), and many such
 * tokens are also a legal pawn move from the position, so opening on one would
 * linkify ordinary text. Bare pawn moves are still absorbed as CONTINUATIONS
 * (they match {@link SAN_RE}), where a legal move-like opener has already
 * established that a variation is being written.
 *
 * The lookbehind confines the opener to a word start (start of text, after
 * whitespace, or after an opening bracket/quote or CJK delimiter) so a
 * digits/letters run — most importantly inside a pasted URL like
 * ".../study/Nf3xyz" — is never carved out of it. The lookahead requires the
 * token to end at a word boundary, so "Bd3" is not pulled out of "Bd3xyz".
 */
const MOVE_OPENER_RE =
  /(?<=^|[\s([{'"「『（、。])(?:O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8](?:=[QRBN])?)[+#]?(?=[\s),.;:!?\]}'"、。）」』]|$)/g;

const WORD_RE = /\S+/y;

/**
 * Sentence punctuation and annotation glyphs tolerated after a SAN token
 * ("Bxa7!", "…was Nf3.", "(Nf3)"). Stripped before the SAN shape test and
 * excluded from the linked range, so the glyphs stay in the following
 * plain-text segment. `+`/`#` are deliberately absent — they are part of SAN
 * itself (check / mate suffixes).
 */
const TRAILING_GLYPHS_RE = /[),.;:!?\]}'"、。）」』]+$/;

type CandidateToken = { san: string; endOffset: number };

/**
 * Walk whitespace-separated words starting at `startOffset`, collecting SAN
 * tokens for as long as they keep looking like moves. Any SAN shape is
 * accepted here (including bare pawn pushes) — the opener guard already
 * confirmed a variation is being written. Stops at the first word that is not
 * a SAN-shaped token.
 */
function collectContinuation(text: string, startOffset: number): CandidateToken[] {
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
    const stripped = word.replace(TRAILING_GLYPHS_RE, '');

    if (!stripped || !SAN_RE.test(stripped)) break;

    tokens.push({ san: stripped, endOffset: wordStart + stripped.length });
    cursor = wordStart + word.length;
  }

  return tokens;
}

/**
 * Split free-form comment text into plain-text and move-reference segments,
 * validating each candidate run against a single base position (`fen`).
 *
 * A run opens on a "move-like" SAN token (see {@link MOVE_OPENER_RE}) and
 * extends through any following SAN tokens; the whole run is checked with
 * `validateMoveSequence`, and only the legal prefix is kept — an illegal move
 * anywhere truncates the run at the last legal move, and an illegal opener
 * drops the run entirely (it stays plain text). Comments with no move-shaped
 * token never touch chess.js.
 */
export function parseMoveReferencesFromFen(text: string, fen: string): FenMoveSegment[] {
  const segments: FenMoveSegment[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  MOVE_OPENER_RE.lastIndex = 0;
  while ((match = MOVE_OPENER_RE.exec(text))) {
    // A later opener match can fall inside a run we already consumed (a
    // continuation move is itself move-like); skip it rather than re-link it.
    if (match.index < cursor) continue;

    const opener = match[0];
    const openerEnd = match.index + opener.length;
    const continuation = collectContinuation(text, openerEnd);

    let validMoves: string[];
    try {
      validMoves = validateMoveSequence(fen, [
        opener,
        ...continuation.map((t) => t.san),
      ]).validMoves;
    } catch {
      // A malformed stored FEN makes `new Chess(fen)` throw. One bad chunk
      // must never crash the whole comment thread — fall back to plain text.
      return [{ type: 'text', value: text }];
    }
    if (validMoves.length === 0) continue; // opener illegal from this position

    // `validMoves` is a prefix of [opener, ...continuation]; index 0 is the
    // opener (ends at `openerEnd`), the rest map to continuation tokens.
    const rawEnd =
      validMoves.length === 1 ? openerEnd : continuation[validMoves.length - 2].endOffset;

    if (match.index > cursor) {
      segments.push({ type: 'text', value: text.slice(cursor, match.index) });
    }
    segments.push({ type: 'moveRef', raw: text.slice(match.index, rawEnd), sans: validMoves });
    cursor = rawEnd;
  }

  if (cursor < text.length) {
    segments.push({ type: 'text', value: text.slice(cursor) });
  }

  return segments;
}
