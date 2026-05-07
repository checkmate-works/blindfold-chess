'use server';

import { validateAttachedPgn } from '@blindfold-chess/features/chess-core';

import { authenticateAndCheckBan } from '@/lib/auth';
import { getChunkBySlug } from '@/lib/chunks/queries';
import { postGamePgnAttachments } from '@/lib/db';
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
      emitFeedItem: false,
      redirectPath: (postId, { toast }) =>
        `/${locale}/chunks/${slug}${toast ? '?toast=post_created' : ''}#post-${postId}`,
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
    case 'lichess':
    case 'lichess_embed': {
      // Phase 13 (#83): Lichess /embed/{id} URLs share the same PGN
      // auto-fetch path as plain Lichess game URLs. The embedId and
      // gameId are both 8-character alnum strings drawn from the same
      // namespace (`/^[A-Za-z0-9]{8}$/`), so the same
      // `resolveLichessAttachmentPgn` call resolves both. The persisted
      // `source_url` is normalized to `https://lichess.org/{id}` (the
      // canonical game URL) regardless of which form the user pasted —
      // the renderer rebuilds the attribution link from `sourceGameId`
      // (D7 pattern), and the canonical form lets the
      // `post_game_pgn_attachments` reuse cache (idx_..._source_game)
      // hit across both URL shapes.
      const lichessId = detected.kind === 'lichess' ? detected.gameId : detected.embedId;
      const resolved = await resolveLichessAttachmentPgn(lichessId);
      if (!resolved.ok) {
        return { error: attachmentErrorKey(resolved.error) };
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
    // The remaining `kind`s are all error variants from
    // `detectAttachmentInput` (no PGN body to attach). They are listed
    // explicitly so a future addition to the discriminated union surfaces
    // as a TS build error instead of silently falling into the default
    // arm. The trailing `: never` guard pins exhaustiveness.
    case 'empty':
    case 'lichess_unsupported':
    case 'chesscom_invalid_url':
    case 'chesscom_invalid_pgn':
    case 'unknown':
      return { error: attachmentErrorKey(detected.kind) };
    // Embed URL kinds. As of Phase 13 (#83), Lichess `lichess_embed`
    // URLs are routed THROUGH this action via the merged `lichess` arm
    // above (auto-fetch + post_game_pgn_attachments insert). chess.com
    // embed URLs remain routed to `createChunkPostWithEmbedAttachment`
    // from the UI layer; if a user pastes a chess.com embed URL into
    // this action's input we surface the generic "invalid pgn" error
    // rather than silently dropping it. The malformed-URL variants
    // (lichess_embed_invalid_url, chesscom_embed_invalid_url) likewise
    // fall through to the generic key — the UI's `detectAttachmentInput`
    // should have surfaced a granular error before submit.
    case 'chesscom_embed':
    case 'chesscom_embed_invalid_url':
    case 'lichess_embed_invalid_url':
      return { error: attachmentErrorKey('unknown') };
    default: {
      // Compile-time exhaustiveness guard. If a future variant is added
      // to `AttachmentInputDetect` without a matching `case` arm above,
      // this assignment fails at build time and forces the new variant
      // to be handled explicitly. The runtime fallback maps to the
      // generic `unknown` reason key — by construction unreachable.
      const _exhaustive: never = detected;
      void _exhaustive;
      return { error: attachmentErrorKey('unknown') };
    }
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
    emitFeedItem: false,
    redirectPath: (postId, { toast }) =>
      `/${locale}/chunks/${slug}${toast ? '?toast=post_created' : ''}#post-${postId}`,
    afterInsert: async (tx, postId) => {
      await tx.insert(postGamePgnAttachments).values({
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
