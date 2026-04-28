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
 *   - { kind: 'lichess_unsupported' } — Lichess URL, but a /study/ link
 *       (multi-chapter; v1 does not handle them)
 *   - { kind: 'chesscom_attribution', attribution } — chess.com URL.
 *       The PGN cannot be auto-fetched (TOS), so the caller must
 *       require a separately-pasted PGN body in addition to the URL.
 *   - { kind: 'pgn', text } — likely PGN text, hand to validateAttachedPgn
 *   - { kind: 'unknown' } — unparseable, surface a generic error
 *
 * The Lichess regex accepts both the bare 8-char ID URL and the longer
 * 12-char "player URL" form (`/{12char}/white|black`); in both cases
 * the returned `gameId` is the first 8 characters, which is the canonical
 * identifier expected by `fetchLichessGamePgn`.
 *
 * @design chess.com handling
 *
 * Per Phase F (C-2), a chess.com URL is no longer a hard reject — it
 * returns `chesscom_attribution` with the validated (platform, path)
 * pair from `parseChesscomAttribution`. The caller is responsible for
 * (a) requiring a PGN body alongside the URL, and (b) persisting the
 * attribution columns. This split keeps the detector pure (no DB / no
 * downstream-error bookkeeping) and keeps URL parsing in one module.
 *
 * If the chess.com URL fails parser validation (wrong protocol, hostile
 * host, etc.) we surface `chesscom_invalid_url` rather than masking it
 * as a generic "unknown" — the user pasted something that looked like a
 * chess.com link, so the message should reflect that.
 */
import { getPgnHeaders } from '@blindfold-chess/features/chess-core';

import type { ChesscomAttribution } from './chesscom-attribution';
import { parseChesscomAttribution } from './chesscom-attribution';
import { parseChesscomEmboardUrl, parseLichessEmbedUrl } from './parse-embed-url';

const LICHESS_URL_RE =
  /^https?:\/\/lichess\.org\/([a-zA-Z0-9]{8})(?:[a-zA-Z0-9]{4})?(?:\/(?:white|black))?\/?$/;

const LICHESS_STUDY_RE = /^https?:\/\/lichess\.org\/study\//;

// Pre-filter for "this looks like a Lichess embed URL". The authoritative
// validation runs through `parseLichessEmbedUrl`; this regex just routes
// the input into the embed branch so a malformed embed URL surfaces a
// Lichess-flavoured error rather than `unknown`.
const LICHESS_EMBED_URL_RE = /^https?:\/\/lichess\.org\/embed\//i;

// Loose pre-filter for "this looks like the user meant chess.com". The
// authoritative validation is done by `parseChesscomAttribution`; we
// want to route any chess.com-ish URL to that parser so the user gets
// a chess.com-flavoured error instead of a generic "unknown" reject.
//
// The filter intentionally matches `chess.com` anywhere in the URL —
// including hostile shapes like `https://www.chess.com@evil.tld/...`
// where `chess.com` lands in the userinfo block, not the hostname.
// We want those routed to the strict parser (which rejects them with
// the right reason code), not silently dropped as "unknown".
const CHESSCOM_URL_RE = /^https?:\/\/.*chess\.com/i;

// Pre-filter for "this looks like a chess.com emboard URL". Routed to
// `parseChesscomEmboardUrl` (strict) so a malformed emboard URL gets a
// chesscom_embed_invalid_url error, not the legacy chesscom_invalid_url
// (which assumes the user pasted a chess.com /game/ URL).
const CHESSCOM_EMBOARD_URL_RE = /^https?:\/\/.*chess\.com\/emboard/i;

export type AttachmentInputDetect =
  | { kind: 'empty' }
  | { kind: 'lichess'; gameId: string }
  | { kind: 'lichess_unsupported' }
  | {
      kind: 'chesscom_attribution';
      attribution: ChesscomAttribution;
      /** Original (validated) URL string for audit / logging. NOT used
       * as a clickable href. */
      sourceUrl: string;
      /** PGN body the user pasted alongside the URL. Absent when the
       * user pasted the URL alone — the action layer treats that as a
       * "paste the PGN body below the URL" guidance error. */
      pgn?: string;
    }
  | { kind: 'chesscom_invalid_url' }
  | { kind: 'chesscom_invalid_pgn' }
  | {
      kind: 'chesscom_embed';
      embedId: string;
      /** Original (validated) URL string for audit / logging. The
       * renderer never reads this back as a `src` — the iframe URL is
       * rebuilt server-side from `(provider, embedId)`. */
      sourceUrl: string;
    }
  | { kind: 'chesscom_embed_invalid_url' }
  | {
      kind: 'lichess_embed';
      embedId: string;
      /** Original (validated) URL string for audit / logging. The
       * renderer never reads this back as a `src` — the iframe URL is
       * rebuilt server-side from `(provider, embedId)`. */
      sourceUrl: string;
    }
  | { kind: 'lichess_embed_invalid_url' }
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

  // Lichess embed URL handling. Runs BEFORE the Lichess game URL match
  // so `lichess.org/embed/{id}` is routed into the embed namespace
  // instead of being misinterpreted as an unknown shape.
  if (LICHESS_EMBED_URL_RE.test(trimmed)) {
    const parsed = parseLichessEmbedUrl(trimmed);
    if (!parsed.ok) {
      return { kind: 'lichess_embed_invalid_url' };
    }
    return {
      kind: 'lichess_embed',
      embedId: parsed.value.embedId,
      sourceUrl: trimmed,
    };
  }

  const lichess = trimmed.match(LICHESS_URL_RE);
  if (lichess) {
    return { kind: 'lichess', gameId: lichess[1] };
  }

  // chess.com emboard URL handling. Runs BEFORE the legacy chess.com
  // first-line + PGN flow so `https://www.chess.com/emboard?id=...` is
  // routed into the embed namespace and not (mis-)interpreted as a
  // chess.com /game/ URL with a missing PGN body.
  if (CHESSCOM_EMBOARD_URL_RE.test(trimmed)) {
    const parsed = parseChesscomEmboardUrl(trimmed);
    if (!parsed.ok) {
      return { kind: 'chesscom_embed_invalid_url' };
    }
    return {
      kind: 'chesscom_embed',
      embedId: parsed.value.embedId,
      sourceUrl: trimmed,
    };
  }

  // chess.com URL handling: the user MUST paste the URL together with
  // the exported PGN (TOS forbids us fetching it). We accept the input
  // when the first non-empty line is the chess.com URL and the rest of
  // the buffer parses as PGN; the URL line is stripped and the remainder
  // becomes the PGN body to validate.
  const lines = trimmed.split(/\r?\n/);
  const firstLine = (lines.find((l) => l.trim().length > 0) ?? '').trim();
  if (CHESSCOM_URL_RE.test(firstLine)) {
    const parsed = parseChesscomAttribution(firstLine);
    if (!parsed.ok) {
      // Looked like a chess.com URL but failed the strict validator.
      // Surface a chess.com-specific error rather than 'unknown' so the
      // user sees a relevant message.
      return { kind: 'chesscom_invalid_url' };
    }
    // Remove the URL line from the input; whatever remains must parse
    // as PGN. We deliberately keep the rest of the buffer verbatim
    // (including any leading blank lines after the URL) so the PGN
    // header block stays intact for `validateAttachedPgn`.
    const firstLineIdx = trimmed.indexOf(firstLine);
    const remainder =
      firstLineIdx === 0
        ? trimmed.slice(firstLine.length).replace(/^\r?\n/, '')
        : // shouldn't happen given the trim() above, but be defensive
          trimmed.replace(firstLine, '').replace(/^\r?\n/, '');
    const remainderTrimmed = remainder.trim();
    if (remainderTrimmed.length === 0) {
      // chess.com URL alone, no PGN body. The action layer translates
      // this into a "paste the PGN below the URL" guidance error.
      return { kind: 'chesscom_attribution', attribution: parsed.value, sourceUrl: firstLine };
    }
    if (looksLikePgnText(remainderTrimmed)) {
      return {
        kind: 'chesscom_attribution',
        attribution: parsed.value,
        sourceUrl: firstLine,
        pgn: remainderTrimmed,
      };
    }
    // chess.com URL + non-PGN text — surface as invalid PGN, not as
    // "unknown", so the user knows what shape we expected.
    return { kind: 'chesscom_invalid_pgn' };
  }

  if (looksLikePgnText(trimmed)) {
    // [Link] auto-extract: if the PGN contains a `[Link "..."]` header with a
    // chess.com URL, extract attribution from it so the user doesn't need to
    // paste the URL on the first line. Falls through to plain PGN if absent
    // or if the Link value fails chess.com validation.
    const headers = getPgnHeaders(trimmed);
    const linkValue = headers['Link'];
    if (linkValue) {
      const parsed = parseChesscomAttribution(linkValue);
      if (parsed.ok) {
        return {
          kind: 'chesscom_attribution',
          attribution: parsed.value,
          sourceUrl: linkValue,
          pgn: trimmed,
        };
      }
    }
    return { kind: 'pgn', text: trimmed };
  }

  return { kind: 'unknown' };
}

function looksLikePgnText(text: string): boolean {
  // PGN heuristic: must contain something that looks like move notation.
  // Either a leading header (`[Event "..."]`) or a `<digit>.` move pair.
  return /^\[[A-Za-z]+\s+"[^"]*"\]/m.test(text) || /\b\d+\.\s*\S/.test(text);
}
