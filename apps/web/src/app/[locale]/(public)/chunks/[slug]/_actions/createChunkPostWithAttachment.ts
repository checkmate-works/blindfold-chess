'use server';

import { validateAttachedPgn } from '@blindfold-chess/features/chess-core';

import { authenticateAndCheckBan } from '@/lib/auth';
import { getChunkBySlug } from '@/lib/chunks/queries';
import { topicPostAttachments } from '@/lib/db';
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
    | 'chesscom_unsupported'
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
    case 'chesscom_unsupported':
      return 'attachment.error.chesscomUnsupported';
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
  if (detected.kind !== 'lichess' && detected.kind !== 'pgn') {
    return { error: attachmentErrorKey(detected.kind) };
  }

  let pgnText: string;
  let sourceKind: 'pgn' | 'lichess';
  let canonicalUrl: string | null = null;
  let lichessGameId: string | null = null;

  if (detected.kind === 'lichess') {
    const resolved = await resolveLichessAttachmentPgn(detected.gameId);
    if (!resolved.ok) {
      return { error: attachmentErrorKey(resolved.error) };
    }
    pgnText = resolved.pgn;
    sourceKind = 'lichess';
    canonicalUrl = resolved.canonicalUrl;
    lichessGameId = detected.gameId;
  } else {
    pgnText = detected.text;
    sourceKind = 'pgn';
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
      await tx.insert(topicPostAttachments).values({
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
      });
    },
    formData,
  });
}
