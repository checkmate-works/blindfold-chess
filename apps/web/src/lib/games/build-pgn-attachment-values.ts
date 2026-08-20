import { validateAttachedPgn } from '@blindfold-chess/features/chess-core';

import type { NewPostGamePgnAttachment } from '@/lib/db';
import { resolveLichessAttachmentPgn } from '@/lib/games/resolve-lichess-attachment';
import { sanitizePgnHeader } from '@/lib/games/sanitize-pgn-header';
import { detectAttachmentInput } from '@/lib/games/validation';

/**
 * Stable error keys returned by `buildPgnAttachmentValues`. Callers map
 * these onto whatever i18n namespace they surface. The mapping mirrors the
 * legacy `attachmentErrorKey` switch in `createPostWithAttachmentBase` so
 * existing UI copy continues to apply.
 */
export type PgnAttachmentErrorKind =
  | 'empty'
  | 'too_large'
  | 'invalid_pgn'
  | 'no_moves'
  | 'invalid_id'
  | 'not_found'
  | 'rate_limited'
  | 'fetch_failed'
  | 'lichess_unsupported'
  | 'chesscom_invalid_url'
  | 'chesscom_invalid_pgn'
  | 'chesscom_pgn_required'
  | 'unknown';

export type BuildPgnAttachmentValuesResult =
  | { ok: true; values: Omit<NewPostGamePgnAttachment, 'postId' | 'createdAt'> }
  | { ok: false; error: PgnAttachmentErrorKind };

/**
 * Run the shared PGN-attachment validation pipeline against a raw
 * `attachment` form-field value, returning the column shape ready to
 * INSERT into `post_game_pgn_attachments` (sans `postId`/`createdAt`).
 *
 * Steps mirror the inline pipeline that previously only lived inside
 * `createPostWithAttachmentBase`:
 *   1. `detectAttachmentInput` classifies the paste (Lichess URL /
 *      Lichess embed / chess.com URL with PGN body / raw PGN / failure).
 *   2. Lichess paths fetch the canonical PGN through the DB-cached
 *      `resolveLichessAttachmentPgn`.
 *   3. chess.com paths require a pasted PGN body alongside the URL and
 *      capture the validated `(attributionPlatform, attributionPath)` pair.
 *   4. `validateAttachedPgn` normalises the PGN through chess-core,
 *      optionally anonymising player names.
 *   5. Sanitise PGN headers (Trojan-source / zero-width strip).
 *
 * Returns `{ ok: true, values }` with the materialised insert shape on
 * success, or `{ ok: false, error }` with a stable error key on failure.
 *
 * Hoisted out of `createPostWithAttachmentBase` so `attachPostPgn` (the
 * edit-flow "attach later" Server Action) can run the exact same
 * pipeline without duplicating ~80 lines of glue.
 */
export async function buildPgnAttachmentValues(
  rawAttachment: string,
  options: { anonymize: boolean }
): Promise<BuildPgnAttachmentValuesResult> {
  const { anonymize } = options;
  const detected = detectAttachmentInput(rawAttachment);

  let pgnText: string;
  let sourceKind: 'pgn' | 'lichess';
  let canonicalUrl: string | null = null;
  let lichessGameId: string | null = null;
  let attributionPlatform: string | null = null;
  let attributionPath: string | null = null;

  switch (detected.kind) {
    case 'lichess':
    case 'lichess_embed': {
      const lichessId = detected.kind === 'lichess' ? detected.gameId : detected.embedId;
      const resolved = await resolveLichessAttachmentPgn(lichessId);
      if (!resolved.ok) {
        return { ok: false, error: resolved.error };
      }
      pgnText = resolved.pgn;
      sourceKind = 'lichess';
      canonicalUrl = resolved.canonicalUrl;
      lichessGameId = lichessId;
      break;
    }
    case 'pgn': {
      pgnText = detected.text;
      sourceKind = 'pgn';
      break;
    }
    case 'chesscom_attribution': {
      if (!detected.pgn) {
        return { ok: false, error: 'chesscom_pgn_required' };
      }
      pgnText = detected.pgn;
      sourceKind = 'pgn';
      canonicalUrl = detected.sourceUrl;
      attributionPlatform = detected.attribution.attributionPlatform;
      attributionPath = detected.attribution.attributionPath;
      break;
    }
    case 'empty':
    case 'lichess_unsupported':
    case 'chesscom_invalid_url':
    case 'chesscom_invalid_pgn':
    case 'unknown':
      return { ok: false, error: detected.kind };
    case 'chesscom_embed':
    case 'chesscom_embed_invalid_url':
    case 'lichess_embed_invalid_url':
      return { ok: false, error: 'unknown' };
    default: {
      const _exhaustive: never = detected;
      void _exhaustive;
      return { ok: false, error: 'unknown' };
    }
  }

  const validated = validateAttachedPgn(pgnText, { anonymize });
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  return {
    ok: true,
    values: {
      source: sourceKind,
      sourceUrl: canonicalUrl,
      sourceGameId: lichessGameId,
      pgn: validated.normalized,
      pgnByteLength: validated.byteLength,
      startingFen: validated.startingFen,
      moveCount: validated.moveCount,
      headerWhite: sanitizePgnHeader(validated.headers.white),
      headerBlack: sanitizePgnHeader(validated.headers.black),
      headerResult: sanitizePgnHeader(validated.headers.result),
      headerEvent: sanitizePgnHeader(validated.headers.event),
      headerSite: sanitizePgnHeader(validated.headers.site),
      headerDate: sanitizePgnHeader(validated.headers.date),
      anonymized: anonymize,
      attributionPlatform,
      attributionPath,
    },
  };
}

/**
 * Map a `PgnAttachmentErrorKind` onto a `topics`-namespace dotted i18n key.
 * Centralised so create-side (`createPostWithAttachmentBase`) and edit-side
 * (`attachPostPgn`) actions return identical user-facing copy.
 */
export function pgnAttachmentErrorKey(err: PgnAttachmentErrorKind): string {
  switch (err) {
    case 'empty':
      return 'attachment.error.empty';
    case 'too_large':
      return 'attachment.error.tooLarge';
    case 'invalid_pgn':
      return 'attachment.error.invalidPgn';
    case 'no_moves':
      return 'attachment.error.noMoves';
    case 'invalid_id':
    case 'not_found':
      return 'attachment.error.lichessNotFound';
    case 'rate_limited':
      return 'attachment.error.lichessRateLimited';
    case 'fetch_failed':
      return 'attachment.error.lichessFetchFailed';
    case 'lichess_unsupported':
      return 'attachment.error.lichessStudyUnsupported';
    case 'chesscom_invalid_url':
      return 'attachment.error.chesscomInvalidUrl';
    case 'chesscom_invalid_pgn':
      return 'attachment.error.chesscomInvalidPgn';
    case 'chesscom_pgn_required':
      return 'attachment.error.chesscomPgnRequired';
    case 'unknown':
      return 'attachment.error.invalidPgn';
    default: {
      // Keep `unknown` explicit so a new error kind is a build error here
      // rather than surfacing to the user as "invalid PGN" on both the create
      // and edit paths this function exists to keep in sync. The sibling
      // dispatch above already did this; only this one had drifted.
      const _exhaustive: never = err;
      void _exhaustive;
      return 'attachment.error.invalidPgn';
    }
  }
}
