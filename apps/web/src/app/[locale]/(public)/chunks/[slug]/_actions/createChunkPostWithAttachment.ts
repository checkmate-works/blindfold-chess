'use server';

import { validateAttachedPgn } from '@blindfold-chess/features/chess-core';

import { authenticateAndCheckBan } from '@/lib/auth';
import { getChunkBySlug } from '@/lib/chunks/queries';
import { postGameAttachments } from '@/lib/db';
import { resolveLichessAttachmentPgn } from '@/lib/games/resolve-lichess-attachment';
import { sanitizePgnHeader } from '@/lib/games/sanitize-pgn-header';
import { detectAttachmentInput } from '@/lib/games/validation';
import { RATE_LIMITS, checkRateLimit } from '@/lib/security/rate-limit';
import { validateContent } from '@/lib/validations/content';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostBase } from '@/app/[locale]/(public)/topics/_actions/createPost';

/**
 * Translates `validateAttachedPgn` / `detectAttachmentInput` errors into the
 * `attachment.*` i18n key set used by the input form.
 */
function attachmentErrorKey(
  err:
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
    | 'unknown'
): string {
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
    default:
      return 'attachment.error.invalidPgn';
  }
}

/**
 * Server Action: create a chunk-topic post with an optional attached game.
 *
 * @description
 * Wraps `createPostBase` exactly the same way `createChunkPost` does, but
 * additionally:
 *   1. parses the `attachment` form field via `detectAttachmentInput`,
 *   2. (Lichess only) resolves the canonical PGN via the DB-cached fetcher,
 *   3. validates + normalizes the PGN through chess-core, optionally
 *      anonymizing the player names per the `anonymize` checkbox,
 *   4. inserts the row inside the same transaction via the
 *      `afterInsert(tx, postId)` hook so the attachment is atomic with the
 *      post.
 *
 * If the user does not paste anything into the attachment field, this
 * action behaves identically to `createChunkPost`: no attachment row is
 * inserted, and the per-attachment rate limit is NOT consumed.
 *
 * Per SPEC1 §3-4, when an attachment IS being created we also charge the
 * `RATE_LIMITS.createPostWithAttachment` budget (5/h) on top of the base
 * `RATE_LIMITS.createPost` (10/h) charged inside `createPostBase`. The
 * extra check runs BEFORE `createPostBase` so a user who is already over
 * the attachment limit does not consume one of their base post slots.
 */
export async function createChunkPostWithAttachment(
  locale: string,
  slug: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  const rawAttachment = formData.get('attachment');
  const attachmentRaw =
    typeof rawAttachment === 'string' && rawAttachment.trim().length > 0 ? rawAttachment : null;

  const anonymize = formData.get('attachmentAnonymize') === 'on';

  // Fast-path: no attachment, behave exactly like createChunkPost.
  if (attachmentRaw === null) {
    return createPostBase({
      locale,
      topicIdentifier: slug,
      topicType: 'chunk',
      topicKey: slug,
      urlSegment: 'chunks',
      validateTopic: async (s) => (await getChunkBySlug(s)) !== null,
      invalidTopicError: 'Invalid chunk',
      rateLimit: RATE_LIMITS.createPost,
      validateContent,
      grantConfig: null,
      emitFeedItem: false,
      redirectPath: (postId) => `/${locale}/chunks/${slug}?toast=post_created#post-${postId}`,
      formData,
    });
  }

  // Authenticate first so we can charge the per-attachment rate limit
  // against the actual user.
  const guardResult = await authenticateAndCheckBan();
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }

  const attachmentRateLimit = await checkRateLimit(
    guardResult.user.id,
    RATE_LIMITS.createPostWithAttachment
  );
  if ('error' in attachmentRateLimit) {
    return { error: 'attachment.error.rateLimitedPostWithAttachment' };
  }

  const detected = detectAttachmentInput(attachmentRaw);

  let pgnText: string;
  let sourceKind: 'pgn' | 'lichess';
  let canonicalUrl: string | null = null;
  let lichessGameId: string | null = null;
  let attributionPlatform: string | null = null;
  let attributionPath: string | null = null;

  switch (detected.kind) {
    case 'lichess': {
      const resolved = await resolveLichessAttachmentPgn(detected.gameId);
      if (!resolved.ok) {
        return { error: attachmentErrorKey(resolved.error) };
      }
      pgnText = resolved.pgn;
      sourceKind = 'lichess';
      canonicalUrl = resolved.canonicalUrl;
      lichessGameId = detected.gameId;
      break;
    }
    case 'pgn': {
      pgnText = detected.text;
      sourceKind = 'pgn';
      break;
    }
    case 'chesscom_attribution': {
      // chess.com TOS forbids us auto-fetching the PGN, so the user
      // must paste the PGN body alongside the URL. If only the URL is
      // present we surface a guidance error instead of accepting an
      // empty attachment.
      if (!detected.pgn) {
        return { error: attachmentErrorKey('chesscom_pgn_required') };
      }
      pgnText = detected.pgn;
      // source = 'pgn' because the persisted PGN is what the user
      // pasted (we did not fetch it from chess.com). The chess.com
      // origin is recorded via the (attributionPlatform, attributionPath)
      // pair so the renderer can build the credit link separately.
      sourceKind = 'pgn';
      // Persist the user-supplied URL on `source_url` for audit only —
      // the rendered href is rebuilt server-side from the validated
      // attribution path and is never sourced from this column.
      canonicalUrl = detected.sourceUrl;
      attributionPlatform = detected.attribution.attributionPlatform;
      attributionPath = detected.attribution.attributionPath;
      break;
    }
    default:
      return { error: attachmentErrorKey(detected.kind) };
  }

  const validated = validateAttachedPgn(pgnText, { anonymize });
  if (!validated.ok) {
    return { error: attachmentErrorKey(validated.error) };
  }

  return createPostBase({
    locale,
    topicIdentifier: slug,
    topicType: 'chunk',
    topicKey: slug,
    urlSegment: 'chunks',
    validateTopic: async (s) => (await getChunkBySlug(s)) !== null,
    invalidTopicError: 'Invalid chunk',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    grantConfig: null,
    emitFeedItem: false,
    redirectPath: (postId) => `/${locale}/chunks/${slug}?toast=post_created#post-${postId}`,
    afterInsert: async (tx, postId) => {
      await tx.insert(postGameAttachments).values({
        postId,
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
      });
    },
    formData,
  });
}
