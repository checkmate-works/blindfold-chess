import { computeMoveNumber } from '@blindfold-chess/features/chess-core/move-numbering';

/**
 * Shared tokenizer for the app's two move-reference parsers — the one that
 * resolves PGN-style references against a game's actual moves
 * (`comment-move-references.ts`) and the one that resolves a variation against
 * a single base position (`move-references-from-fen.ts`).
 *
 * The two differ in what OPENS a run and what position it branches from. They
 * do not differ in what a SAN token looks like, which trailing punctuation is
 * tolerated, or how an interleaved "N." label is checked — and that shared part
 * used to exist as a byte-identical copy in each file, with comments in one
 * saying it "mirrors the games parser". Copies that document their own need to
 * stay in sync belong in one place.
 *
 * Each parser keeps its own opener regex. They share only a word-start
 * lookbehind — `(?<=^|[\s([{'"「『（、。])`, which stops an opener being carved
 * out of the middle of a longer token such as a pasted URL — and assembling
 * both openers from string fragments to dedupe that one prefix would cost the
 * readability and literal-syntax checking of a regex literal for nothing.
 */

/**
 * SAN for any single move, including a bare pawn push ("b6") and promotions.
 * Note this is deliberately permissive about what may OPEN a run — each parser
 * applies its own opener rule before extending with this.
 */
export const SAN_RE = /^(?:O-O-O|O-O|(?:[KQRBN])?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?)[+#]?$/;

/** A word that is nothing but a "N." / "N..." move-number label. */
export const BARE_ANCHOR_RE = /^(\d+)(\.{1,3})$/;
/** A "N." / "N..." label glued to the move that follows it ("9.O-O"). */
export const LEADING_ANCHOR_RE = /^(\d+)(\.{1,3})/;

/**
 * Sentence punctuation and annotation glyphs tolerated after a SAN token
 * ("8. Bd3!", "…was 3. Bc4.", "(3. Bc4)"). Stripped before the SAN shape test
 * and excluded from the linked range, so the glyphs stay in the following
 * plain-text segment. `+`/`#` are deliberately absent — they are part of SAN
 * itself (check / mate suffixes).
 */
export const TRAILING_GLYPHS_RE = /[),.;:!?\]}'"、。）」』]+$/;

const WORD_RE = /\S+/y;

/** One SAN token accepted into a run, with where it ends in the source text. */
export type CandidateToken = { san: string; endOffset: number };

export type LabelContext = {
  /**
   * Ply the run branches from. The game parser sets this to the ply its
   * anchor located; a parser working from a single base position uses 0.
   */
  basePly: number;
  startsAsBlack: boolean;
  /** Move number the position at `basePly` is labelled with. */
  startMoveNumber: number;
};

/**
 * Whether an interleaved "N." / "N..." label agrees with the move the run's
 * next token would occupy (`basePly + collected`). A label claiming a
 * different move number or color means the writer started a NEW reference
 * ("8. Bd3 Bb7 15. O-O"), so the current run must stop rather than absorb
 * it — a fused link would otherwise replay that move at a ply the text never
 * claimed. The stopped-at label is then re-scanned as its own opener.
 */
export function labelAgrees(
  digits: string,
  dots: string,
  ctx: LabelContext,
  collected: number
): boolean {
  const { moveNumber, isWhiteMove } = computeMoveNumber(
    ctx.basePly + collected,
    ctx.startsAsBlack,
    ctx.startMoveNumber
  );
  return parseInt(digits, 10) === moveNumber && (dots.length === 1) === isWhiteMove;
}

/**
 * Walk whitespace-separated words starting at `startOffset`, collecting SAN
 * tokens for as long as they keep looking like moves. Tolerates an interleaved
 * move-number label before a later move ("9." or the glued "9.O-O") since
 * consecutive-move references repeat that label per PGN convention — but only
 * when the label agrees with the ply the run has reached (see
 * {@link labelAgrees}). Stops at the first word that is neither an agreeing
 * move-number label nor a SAN-shaped token.
 *
 * `collected` counts moves already in the run before `startOffset` — 1 when the
 * caller consumed a SAN token as the opener, 0 when the run opened on a bare
 * anchor.
 */
export function collectCandidates(
  text: string,
  startOffset: number,
  ctx: LabelContext,
  collected = 0
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
