'use server';

/**
 * @deprecated #84 Pre-release scope reduction: the Game tab is
 * restricted to PGN-only and rejects every URL shape on the client
 * side, so this Server Action (chess.com /emboard URL → embed
 * attachment) is no longer reached by any UI flow. The file is kept
 * intact (rather than deleted) so a future release can re-enable
 * chess.com embed input by restoring the URL sub-mode in
 * `AttachmentInput` + the `kind: 'embed'` arm in `NewPostForm`'s
 * submit handler. The render layer (`AttachedEmbedCard`, chess.com-only
 * since Lichess embeds were retired) remains wired so existing posts
 * still display.
 */
import * as Sentry from '@sentry/nextjs';
import { eq } from 'drizzle-orm';

import { authenticateAndCheckBan } from '@/lib/auth';
import { getChunkBySlug } from '@/lib/chunks/queries';
import { postGameEmbedAttachments, postGamePgnAttachments } from '@/lib/db';
import { parseChesscomEmboardUrl } from '@/lib/games/parse-embed-url';
import { RATE_LIMITS, checkRateLimit } from '@/lib/security/rate-limit';
import { validateContent } from '@/lib/validations/content';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostBase } from '@/app/[locale]/(public)/topics/_actions/createPost';

/**
 * Translates URL-parser failure reasons into the `attachment.embed.*` i18n
 * key used by the input form.
 */
function embedErrorKey(reason: string): string {
  // Capture the granular reason for observability while exposing
  // a single user-facing message. Reasons covered: 'invalid_url',
  // 'wrong_protocol', 'has_userinfo', 'wrong_host', 'invalid_path',
  // 'invalid_id', 'fragment_not_allowed', 'input_too_long'.
  Sentry.captureMessage(`embed URL parser rejected: ${reason}`, {
    level: 'warning',
    tags: { component: 'createChunkPostWithEmbedAttachment', reason },
  });
  return 'attachment.embed.invalidUrl';
}

/**
 * Server Action: create a chunk-topic post with an attached chess.com
 * iframe embed.
 *
 * @description
 * Mirrors `createChunkPostWithAttachment` for the chess.com /emboard
 * kind. Differences vs the PGN flow:
 *   1. Input: `embedProvider` + `embedSourceUrl` from the form. The raw
 *      `embedSourceUrl` is re-parsed server-side; we NEVER trust a
 *      client-passed `embedId`. (SecurityEngineer baseline D8 #46.)
 *   2. After validation, the canonical `source_url` is rebuilt from
 *      `(provider, embedId)` and persisted; the raw user input is
 *      discarded so a hostile-but-shaped-correct paste cannot land in
 *      the DB.
 *   3. Attribution: NULL/NULL per Q1 (emboard URL only, no separate
 *      attribution input in Phase B).
 *   4. PGN/embed exclusivity: a defensive query against
 *      `post_game_pgn_attachments` ensures we never associate an embed
 *      with a post that already has a PGN attachment. The post is
 *      created in this same Server Action so the check is for
 *      defense-in-depth — a future "add embed to existing post" flow
 *      would rely on it for the actual invariant.
 *
 * Wired into the same rate-limit bucket as
 * `createChunkPostWithAttachment` (`RATE_LIMITS.createPostWithAttachment`)
 * — embed attachments share the same per-user budget as PGN attachments
 * because the hosting cost (iframe / DB row) is comparable.
 *
 * @design Lichess is not an embed provider here (#83)
 *
 * Lichess /embed/{id} URLs were originally handled here too. They now
 * route through `createChunkPostWithAttachment` instead — the
 * self-hosted PGN replay UI replaces the Lichess iframe for license +
 * UX reasons. This action is therefore chess.com-only;
 * the DB CHECK on `post_game_embed_attachments.embed_provider` is
 * narrowed to `IN ('chesscom')` as the load-bearing invariant.
 */
export async function createChunkPostWithEmbedAttachment(
  locale: string,
  slug: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  const rawProvider = formData.get('embedProvider');
  const rawSourceUrl = formData.get('embedSourceUrl');

  // `chesscom` is the only valid embed provider (#83).
  // The form may still surface `lichess` as an in-flight client value
  // during a stale page load; we fail closed rather than treating it
  // as chesscom.
  const embedProvider = rawProvider === 'chesscom' ? 'chesscom' : null;
  const embedSourceUrl =
    typeof rawSourceUrl === 'string' && rawSourceUrl.trim().length > 0 ? rawSourceUrl.trim() : null;

  if (embedProvider === null || embedSourceUrl === null) {
    return { error: 'attachment.embed.invalidUrl' };
  }

  // Authenticate first so the per-attachment rate limit is charged
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

  // Server-side re-validation. We re-parse the raw URL here regardless
  // of what the client claimed — never trust a client-passed embed id.
  // (SecurityEngineer baseline D8 #46.)
  const parsed = parseChesscomEmboardUrl(embedSourceUrl);
  if (!parsed.ok) {
    return { error: embedErrorKey(parsed.reason) };
  }

  // Cross-check: the form's declared provider must match the URL shape.
  // A mismatch indicates either tampering or a UI bug; either way, fail
  // closed.
  if (parsed.value.provider !== embedProvider) {
    return { error: 'attachment.embed.invalidUrl' };
  }

  const embedId = parsed.value.embedId;

  // Canonical URL reconstruction. We persist the URL we built from the
  // validated `(provider, embedId)` pair, NOT the raw user input — even
  // though the row's `source_url` is audit-only and never rendered as a
  // src/href, having a canonical form makes downstream forensics
  // unambiguous.
  const canonicalSourceUrl = `https://www.chess.com/emboard?id=${embedId}`;

  // Attribution columns. chess.com is NULL/NULL per Q1.
  const attributionPlatform: string | null = null;
  const attributionPath: string | null = null;

  const chunk = await getChunkBySlug(slug);

  return createPostBase({
    locale,
    topicIdentifier: slug,
    topicType: 'chunk',
    topicKey: slug,
    urlSegment: 'chunks',
    validateTopic: () => chunk !== null,
    invalidTopicError: 'Invalid chunk',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    emitFeedItem: false,
    topicAuthorId: chunk?.userId,
    redirectPath: (postId, { toast }) =>
      `/${locale}/chunks/${slug}${toast ? '?toast=post_created' : ''}#post-${postId}`,
    afterInsert: async (tx, postId) => {
      // Defensive PGN/embed exclusivity check. The post is brand-new
      // (just inserted in this transaction) so this can only fire if a
      // future flow lets an existing post acquire a PGN attachment
      // before this branch runs. Documented as a defense-in-depth
      // guard; the application invariant is otherwise enforced by the
      // shape of the Server Actions (one path per kind).
      const existingPgn = await tx
        .select({ id: postGamePgnAttachments.id })
        .from(postGamePgnAttachments)
        .where(eq(postGamePgnAttachments.postId, postId))
        .limit(1);
      if (existingPgn.length > 0) {
        throw new Error('PGN/embed exclusivity violated: post already has a PGN attachment');
      }

      await tx.insert(postGameEmbedAttachments).values({
        postId,
        embedProvider,
        embedId,
        sourceUrl: canonicalSourceUrl,
        attributionPlatform,
        attributionPath,
      });
    },
    formData,
  });
}
