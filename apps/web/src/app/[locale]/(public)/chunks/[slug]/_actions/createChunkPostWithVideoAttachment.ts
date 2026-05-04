'use server';

import { getChunkBySlug } from '@/lib/chunks/queries';
import { postVideoAttachments } from '@/lib/db';
import { extractPgErrorCode } from '@/lib/db/extract-pg-error-code';
import { parseYouTubeUrl } from '@/lib/games/youtube-validator';
import type { YouTubeUrlReason } from '@/lib/games/youtube-validator';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateContent } from '@/lib/validations/content';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostBase } from '@/app/[locale]/(public)/topics/_actions/createPost';

/**
 * Maximum length of a stored source URL. Mirrors
 * `post_video_attachments.source_url` column width and the URL parser's
 * `MAX_INPUT_LENGTH`. Pinned in lock-step with `attachPostVideo.ts`.
 */
const SOURCE_URL_MAX_LENGTH = 512;

/**
 * Map a YouTube URL parser failure reason to its localized error key
 * under the `postVideoAttachment.error.*` namespace. Mirrors
 * `attachPostVideo.ts` so the two entry points share an error vocabulary.
 */
function reasonToErrorKey(reason: YouTubeUrlReason): string {
  switch (reason) {
    case 'input_too_long':
      return 'postVideoAttachment.error.inputTooLong';
    case 'invalid_url':
      return 'postVideoAttachment.error.invalidUrl';
    case 'protocol_not_https':
      return 'postVideoAttachment.error.protocolNotHttps';
    case 'userinfo_present':
      return 'postVideoAttachment.error.userinfoPresent';
    case 'fragment_not_allowed':
      return 'postVideoAttachment.error.fragmentNotAllowed';
    case 'host_not_allowed':
      return 'postVideoAttachment.error.hostNotAllowed';
    case 'pathname_not_supported':
      return 'postVideoAttachment.error.pathnameNotSupported';
    case 'param_pollution':
      return 'postVideoAttachment.error.paramPollution';
    case 'invalid_id':
      return 'postVideoAttachment.error.invalidId';
    default: {
      // Compile-time exhaustiveness guard.
      const _exhaustive: never = reason;
      void _exhaustive;
      return 'postVideoAttachment.error.invalidUrl';
    }
  }
}

/**
 * Server Action: create a chunk-topic post with an attached YouTube
 * video in a single transaction.
 *
 * @description
 * Pairs `createChunkPostWithEmbedAttachment` for the video kind.
 * Validation order:
 *   1. trim URL once at the top (Lessons §10)
 *   2. URL length pre-check
 *   3. parse + provider-specific id extraction
 *   4. atomic INSERT inside the post-creation transaction
 *
 * @design Trim canonicalization (Lessons §10)
 *
 * The URL is trimmed once at the top so the parser, the length pre-check,
 * and the INSERT all see the same canonical value — same contract as
 * `attachPostVideo.ts`.
 *
 * @design SQLSTATE mapping (Lessons §11 + §16)
 *
 * Catches Drizzle-wrapped insert failures via the canonical
 * `extractPgErrorCode` helper. Branches:
 *   - `23505` (unique_violation) → `alreadyAttached`
 *   - `23514` (check_violation) → `invalidVideoStructure` (defense-in-depth)
 *   - `22001` (string_data_right_truncation) → `tooLong` (defense-in-depth)
 *
 * @design `youtube-nocookie.com` is render-only
 *
 * The persisted `source_url` is audit-only. The renderer (`AttachedVideoCard`)
 * rebuilds the iframe `src` from `(provider, providerVideoId)` via the
 * `youtube-nocookie.com` host — see SPEC2 Lessons §17.
 */
export async function createChunkPostWithVideoAttachment(
  locale: string,
  slug: string,
  _prevState: CreatePostState,
  formData: FormData
): Promise<CreatePostState> {
  const rawUrlInput = formData.get('attachmentVideoUrl');

  // Single canonical trim (Lessons §10).
  const url = typeof rawUrlInput === 'string' ? rawUrlInput.trim() : '';

  if (url.length === 0) {
    return { error: 'postVideoAttachment.error.urlRequired' };
  }
  if (url.length > SOURCE_URL_MAX_LENGTH) {
    return { error: 'postVideoAttachment.error.inputTooLong' };
  }

  const parsed = parseYouTubeUrl(url);
  if (!parsed.ok) {
    return { error: reasonToErrorKey(parsed.reason) };
  }
  const { provider, providerVideoId, sourceUrl } = parsed.value;

  try {
    return await createPostBase({
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
        await tx.insert(postVideoAttachments).values({
          postId,
          provider,
          providerVideoId,
          sourceUrl,
        });
      },
      formData,
    });
  } catch (err) {
    const code = extractPgErrorCode(err);
    if (code === '23505') {
      return { error: 'postVideoAttachment.error.alreadyAttached' };
    }
    if (code === '23514') {
      // Defense-in-depth — `parseYouTubeUrl` already covers every
      // condition the DB CHECK could fail on. Triage points:
      //   - JS regex / parser:
      //       apps/web/src/lib/games/youtube-validator.ts
      //       apps/web/src/lib/games/youtube-validator.test.ts
      //   - DB CHECK source (constraints
      //       `post_video_attachments_chk_provider`,
      //       `post_video_attachments_chk_provider_video_id`,
      //       `post_video_attachments_chk_source_url`):
      //       apps/web/drizzle/20260504080000_create_post_video_attachments.sql
      //       apps/web/src/lib/db/schema/tables.ts (postVideoAttachments)
      return { error: 'postVideoAttachment.error.invalidVideoStructure' };
    }
    if (code === '22001') {
      // Defense-in-depth — app-layer length pre-check on `url` already
      // guards against this. Only fires on a column-width shrink without
      // a matching pre-check tightening.
      return { error: 'postVideoAttachment.error.tooLong' };
    }
    throw err;
  }
}
