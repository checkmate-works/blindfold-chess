import { validateMoveSequence } from '@blindfold-chess/features/chess-core';

import { parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';
import {
  computeMoveNumber,
  plyFromMoveNumber,
} from '@/app/[locale]/(public)/practice/(free-play)/recall/_lib/compute-move-number';

/**
 * A slice of comment text: either plain text or a run of SAN moves
 * (e.g. "Bxa7 b6" or "1. e4 e5") that were verified legal from a single base
 * position and can be replayed from it.
 *
 * Unlike the game-comment references (`comment-move-references.ts`), a move
 * number here does not LOCATE anything: a chunk comment is written against ONE
 * position (the chunk's representative FEN), so every run branches from that
 * FEN. A "N." / "N..." anchor is still accepted as a run opener — commenters
 * naturally number a suggested variation from 1 (puzzle-solution convention),
 * or from the FEN's own fullmove number — but it must name the FIRST move of
 * the branch; any other number is left as plain text.
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
 * A run OPENER: either a "N." / "N..." move-number anchor (digits and dots
 * captured separately, mirroring the games parser) or a "move-like" SAN — a
 * piece move (starts with KQRBN), a capture (contains `x`, including pawn
 * captures), or castling. A bare pawn push ("b6", "e4") is deliberately NOT
 * allowed to OPEN a run on its own: chunk comments routinely name squares in
 * prose ("the b6 square is weak"), and many such tokens are also a legal pawn
 * move from the position, so opening on one would linkify ordinary text. Bare
 * pawn pushes ARE linkable behind an anchor ("1. e4") or as CONTINUATIONS of
 * an open run, where the writer has already signalled a variation.
 *
 * The lookbehind confines the opener to a word start (start of text, after
 * whitespace, or after an opening bracket/quote or CJK delimiter) so a
 * digits/letters run — most importantly inside a pasted URL like
 * ".../study/Nf3xyz" or ".../study/abc/8.Bd3" — is never carved out of it.
 * The lookahead requires a SAN opener to end at a word boundary, so "Bd3" is
 * not pulled out of "Bd3xyz".
 */
const RUN_OPENER_RE =
  /(?<=^|[\s([{'"「『（、。])(?:(\d+)(\.{1,3})|(?:O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8](?:=[QRBN])?)[+#]?(?=[\s),.;:!?\]}'"、。）」』]|$))/g;

const BARE_ANCHOR_RE = /^(\d+)(\.{1,3})$/;
const LEADING_ANCHOR_RE = /^(\d+)(\.{1,3})/;
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

type LabelContext = {
  startsAsBlack: boolean;
  /** The move number the run's FIRST move is labelled with (1 or FEN's own). */
  startMoveNumber: number;
};

/**
 * Whether an interleaved "N." / "N..." label agrees with the move the run's
 * next token would occupy (`collected` moves in). A disagreeing label means
 * the writer started something else, so the current run must stop rather
 * than absorb it. Mirrors the games parser's labelAgrees with basePly = 0.
 */
function labelAgrees(digits: string, dots: string, ctx: LabelContext, collected: number): boolean {
  const { moveNumber, isWhiteMove } = computeMoveNumber(
    collected,
    ctx.startsAsBlack,
    ctx.startMoveNumber
  );
  return parseInt(digits, 10) === moveNumber && (dots.length === 1) === isWhiteMove;
}

/**
 * Walk whitespace-separated words starting at `startOffset`, collecting SAN
 * tokens for as long as they keep looking like moves. Any SAN shape is
 * accepted here (including bare pawn pushes) — the opener guard already
 * confirmed a variation is being written. Tolerates an interleaved
 * move-number label before a later move ("2." or the glued "2.Nf3") since
 * numbered variations repeat that label per PGN convention — but only when
 * the label agrees with the position the run has reached (see
 * {@link labelAgrees}). Stops at the first word that is neither an agreeing
 * label nor a SAN-shaped token.
 *
 * `collected` counts the moves already in the run before `startOffset` (1
 * when a SAN opener was consumed, 0 when the run opened on a bare anchor).
 */
function collectCandidates(
  text: string,
  startOffset: number,
  ctx: LabelContext,
  collected: number
): CandidateToken[] {
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
      if (!labelAgrees(bare[1], bare[2], ctx, collected + tokens.length)) break;
      cursor = wordStart + word.length;
      continue;
    }

    const glued = LEADING_ANCHOR_RE.exec(word);
    if (glued && !labelAgrees(glued[1], glued[2], ctx, collected + tokens.length)) break;
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
 * Split free-form comment text into plain-text and move-reference segments,
 * validating each candidate run against a single base position (`fen`).
 *
 * A run opens on a "move-like" SAN token OR a "N." / "N..." anchor naming the
 * branch's first move (see {@link RUN_OPENER_RE}) and extends through any
 * following SAN tokens (with agreeing interleaved labels: "1. e4 e5 2. Nf3");
 * the whole run is checked with `validateMoveSequence`, and only the legal
 * prefix is kept — an illegal move anywhere truncates the run at the last
 * legal move, and an illegal (or empty) opening drops the run entirely (it
 * stays plain text). Comments with no move-shaped token never touch chess.js.
 *
 * An opening anchor must label the FIRST move of the branch: number 1
 * (variation convention) or the FEN's own fullmove number, with the dot count
 * matching the FEN's side to move ("1." when White is to move, "1..." when
 * Black is). Anything else — "3. e4" against a fresh position — is not a
 * reference to THIS position and stays plain text.
 */
export function parseMoveReferencesFromFen(text: string, fen: string): FenMoveSegment[] {
  const segments: FenMoveSegment[] = [];
  const { startsAsBlack, startMoveNumber: fenMoveNumber } = parseFenMeta(fen);
  let cursor = 0;
  let match: RegExpExecArray | null;

  RUN_OPENER_RE.lastIndex = 0;
  while ((match = RUN_OPENER_RE.exec(text))) {
    // A later opener match can fall inside a run we already consumed (a
    // continuation move is itself move-like); skip it rather than re-link it.
    if (match.index < cursor) continue;

    let tokens: CandidateToken[];
    let ctx: LabelContext;

    if (match[1] !== undefined) {
      // Anchor opener: pick whichever numbering base (variation-relative 1,
      // or the FEN's own fullmove) the label names the branch's FIRST move
      // in; a label that fits neither is not a reference to this position.
      const labelNumber = parseInt(match[1], 10);
      const isWhiteLabel = match[2].length === 1;
      const base = [1, fenMoveNumber].find(
        (startNumber) =>
          plyFromMoveNumber(labelNumber, isWhiteLabel, startsAsBlack, startNumber) === 0
      );
      if (base === undefined) continue;

      ctx = { startsAsBlack, startMoveNumber: base };
      tokens = collectCandidates(text, match.index + match[0].length, ctx, 0);
      if (tokens.length === 0) continue;
    } else {
      // SAN opener: the opener itself is move 1 of the (unlabelled) branch.
      ctx = { startsAsBlack, startMoveNumber: 1 };
      const openerEnd = match.index + match[0].length;
      tokens = [
        { san: match[0], endOffset: openerEnd },
        ...collectCandidates(text, openerEnd, ctx, 1),
      ];
    }

    let validMoves: string[];
    try {
      validMoves = validateMoveSequence(
        fen,
        tokens.map((t) => t.san)
      ).validMoves;
    } catch {
      // A malformed stored FEN makes `new Chess(fen)` throw — chunk FENs may
      // legitimately be kingless piece patterns chess.js refuses to load. One
      // such chunk must never crash the whole comment thread — fall back to
      // plain text.
      return [{ type: 'text', value: text }];
    }
    if (validMoves.length === 0) continue; // first move illegal from this position

    const rawEnd = tokens[validMoves.length - 1].endOffset;

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
