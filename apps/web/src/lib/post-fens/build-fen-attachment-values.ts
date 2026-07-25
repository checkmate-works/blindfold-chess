import { validateFenSemantic } from '@blindfold-chess/features/chess-core';

import { extractPgErrorCode } from '@/lib/db/extract-pg-error-code';

import { FEN_MAX_LENGTH } from './constants';
import { sanitizeFenCaption } from './sanitize-fen-caption';

/**
 * Maximum length of a stored caption. Aligned with the
 * `post_fen_attachments.caption` column width and `sanitizeFenCaption`'s cap.
 * The sanitizer already slices to this length; this constant is the
 * pre-sanitize gate so we surface a structured error instead of silently
 * truncating.
 */
const CAPTION_MAX_LENGTH = 200;

/**
 * Stable error kinds returned by `buildFenAttachmentValues` (and the DB-error
 * mapper `fenAttachmentPgErrorKind`). Callers turn these into the user-facing
 * dotted i18n key via `fenAttachmentErrorKey`. Mirrors the PGN sibling
 * (`build-pgn-attachment-values.ts`) so both attachment surfaces share one
 * shape.
 */
export type FenAttachmentErrorKind =
  | 'fen_required'
  | 'fen_too_long'
  | 'invalid_fen_structure'
  | 'invalid_fen_semantic'
  | 'caption_too_long'
  | 'already_attached';

export type FenAttachmentValues = { fen: string; caption: string | null };

export type BuildFenAttachmentValuesResult =
  { ok: true; values: FenAttachmentValues } | { ok: false; error: FenAttachmentErrorKind };

/**
 * Run the shared `post_fen_attachments` validation pipeline against raw
 * `attachmentFen` / `attachmentFenCaption` inputs, returning the column shape
 * ready to INSERT (sans `postId`) on success or a stable error kind on
 * failure.
 *
 * Steps mirror the inline pipeline that previously lived — byte-for-byte —
 * inside `createPostWithFenAttachmentBase`, `createReplyWithFenAttachmentBase`
 * and `attachPostFen`:
 *
 *   1. Canonical trim (Lessons §10). `validateFenSemantic` also trims
 *      internally, but the DB CHECK regex is anchored (`^...$`) and does NOT
 *      trim — the single trim here keeps validator contract and DB contract in
 *      lock-step so a whitespace-padded FEN can never pass validation then trip
 *      the CHECK constraint.
 *   2. Length gate (`fen_required` / `fen_too_long`).
 *   3. `validateFenSemantic` — structural (`structure` → `invalid_fen_structure`)
 *      then semantic (kings / pawns / castling / ep → `invalid_fen_semantic`).
 *   4. Caption length pre-check (`caption_too_long`) before sanitizing.
 *   5. Caption sanitization (Trojan Source / zero-width / TAG strip); empty /
 *      all-invisible captions collapse to `null`.
 *
 * Pure and synchronous — no auth, no DB. Callers own auth / ownership / rate
 * limiting and the INSERT.
 */
export function buildFenAttachmentValues(
  rawFen: unknown,
  rawCaption: unknown
): BuildFenAttachmentValuesResult {
  // Single canonical trim (Lessons §10).
  const fen = typeof rawFen === 'string' ? rawFen.trim() : '';

  if (fen.length === 0) {
    return { ok: false, error: 'fen_required' };
  }
  if (fen.length > FEN_MAX_LENGTH) {
    return { ok: false, error: 'fen_too_long' };
  }

  const fenResult = validateFenSemantic(fen);
  if (!fenResult.ok) {
    switch (fenResult.reason) {
      case 'structure':
        return { ok: false, error: 'invalid_fen_structure' };
      case 'kings':
      case 'pawn_placement':
      case 'piece_count':
      case 'castling_rights':
      case 'en_passant':
      case 'illegal_position':
        return { ok: false, error: 'invalid_fen_semantic' };
      default: {
        const _exhaustive: never = fenResult.reason;
        void _exhaustive;
        return { ok: false, error: 'invalid_fen_semantic' };
      }
    }
  }

  const rawCap = typeof rawCaption === 'string' ? rawCaption : null;
  if (rawCap !== null && rawCap.length > CAPTION_MAX_LENGTH) {
    return { ok: false, error: 'caption_too_long' };
  }
  const caption = sanitizeFenCaption(rawCap);

  return { ok: true, values: { fen, caption } };
}

/**
 * Map a caught Postgres error onto a `FenAttachmentErrorKind`, or `null` when
 * the error is not one of the three known INSERT-time constraint failures (the
 * caller should rethrow in that case).
 *
 * 23505 → `already_attached` (UNIQUE(post_id)); 23514 → `invalid_fen_structure`
 * (CHECK — defense-in-depth); 22001 → `fen_too_long` (varchar width —
 * defense-in-depth). The two defensive branches are practically unreachable
 * because `buildFenAttachmentValues`' regex / length gate fire first.
 */
export function fenAttachmentPgErrorKind(err: unknown): FenAttachmentErrorKind | null {
  const code = extractPgErrorCode(err);
  if (code === '23505') return 'already_attached';
  if (code === '23514') return 'invalid_fen_structure';
  if (code === '22001') return 'fen_too_long';
  return null;
}

/**
 * Map a `FenAttachmentErrorKind` onto its `postFenAttachment.error.*` i18n key.
 * Centralised so the create-side bases and the edit-side `attachPostFen` action
 * return identical user-facing copy from one place.
 */
export function fenAttachmentErrorKey(err: FenAttachmentErrorKind): string {
  switch (err) {
    case 'fen_required':
      return 'postFenAttachment.error.fenRequired';
    case 'fen_too_long':
      return 'postFenAttachment.error.fenTooLong';
    case 'invalid_fen_structure':
      return 'postFenAttachment.error.invalidFenStructure';
    case 'invalid_fen_semantic':
      return 'postFenAttachment.error.invalidFenSemantic';
    case 'caption_too_long':
      return 'postFenAttachment.error.captionTooLong';
    case 'already_attached':
      return 'postFenAttachment.error.alreadyAttached';
    default: {
      const _exhaustive: never = err;
      void _exhaustive;
      return 'postFenAttachment.error.invalidFenSemantic';
    }
  }
}
