/**
 * Input parsing for the topic post attachment form.
 *
 * @description
 * Mirrors the `@/lib/chunks/validation.ts` pattern: a thin, pure module
 * that turns raw form input into a typed parse result. Server Actions
 * call this BEFORE any DB / Lichess work so the network code only ever
 * sees well-shaped values.
 *
 * @design Detection contract
 *
 * `detectAttachmentInput` returns one of:
 *   - { kind: 'empty' } — nothing pasted, treat as "no attachment"
 *   - { kind: 'lichess', gameId } — Lichess URL (ID always normalized
 *       to canonical 8 chars; see SPEC1 §2-1)
 *   - { kind: 'chesscom_unsupported' } — chess.com URL, surface a
 *       guidance error
 *   - { kind: 'pgn', text } — likely PGN text, hand to validateAttachedPgn
 *   - { kind: 'unknown' } — unparseable, surface a generic error
 *
 * The Lichess regex accepts both the bare 8-char ID URL and the longer
 * 12-char "player URL" form (`/{12char}/white|black`); in both cases
 * the returned `gameId` is the first 8 characters, which is the canonical
 * identifier expected by `fetchLichessGamePgn`.
 */

const LICHESS_URL_RE =
  /^https?:\/\/lichess\.org\/([a-zA-Z0-9]{8})(?:[a-zA-Z0-9]{4})?(?:\/(?:white|black))?\/?$/;

const LICHESS_STUDY_RE = /^https?:\/\/lichess\.org\/study\//;

const CHESSCOM_URL_RE = /^https?:\/\/(?:www\.)?chess\.com\//;

export type AttachmentInputDetect =
  | { kind: 'empty' }
  | { kind: 'lichess'; gameId: string }
  | { kind: 'lichess_unsupported' }
  | { kind: 'chesscom_unsupported' }
  | { kind: 'pgn'; text: string }
  | { kind: 'unknown' };

export function detectAttachmentInput(raw: string | null | undefined): AttachmentInputDetect {
  if (!raw) return { kind: 'empty' };
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { kind: 'empty' };

  if (LICHESS_STUDY_RE.test(trimmed)) {
    // Studies have multi-chapter structure; v1 does not handle them.
    return { kind: 'lichess_unsupported' };
  }

  const lichess = trimmed.match(LICHESS_URL_RE);
  if (lichess) {
    return { kind: 'lichess', gameId: lichess[1] };
  }

  if (CHESSCOM_URL_RE.test(trimmed)) {
    return { kind: 'chesscom_unsupported' };
  }

  // PGN heuristic: must contain something that looks like move notation.
  // Either a leading header (`[Event "..."]`) or a `<digit>.` move pair.
  const looksLikePgn = /^\[[A-Za-z]+\s+"[^"]*"\]/m.test(trimmed) || /\b\d+\.\s*\S/.test(trimmed);

  if (looksLikePgn) {
    return { kind: 'pgn', text: trimmed };
  }

  return { kind: 'unknown' };
}
