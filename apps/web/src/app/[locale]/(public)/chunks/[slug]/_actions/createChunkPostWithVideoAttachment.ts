'use server';

/**
 * @deprecated #84 Pre-release scope reduction: the Media tab is
 * removed from `AttachmentModal`, so this Server Action is no longer
 * invoked by any UI flow. The file is kept intact (rather than
 * deleted) so a future release can re-enable YouTube video input by
 * restoring the Media tab + `kind: 'video'` arm in `NewPostForm`'s
 * submit handler. The render layer (`AttachedVideoCard`) remains
 * wired so existing posts still display.
 */
import { getChunkBySlug } from '@/lib/chunks/queries';
import { postVideoAttachments } from '@/lib/db';
import { parseYouTubeUrl } from '@/lib/games/youtube-validator';
import {
  SOURCE_URL_MAX_LENGTH,
  reasonToErrorKey,
  videoAttachmentErrorKeyForPgError,
} from '@/lib/post-video-attachment';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { validateContent } from '@/lib/validations/content';

import type { CreatePostState } from '@/app/[locale]/(public)/topics/_actions/createPost';
import { createPostBase } from '@/app/[locale]/(public)/topics/_actions/createPost';

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
 * `youtube-nocookie.com` host, so a persisted URL can never decide what
 * gets framed.
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

  const chunk = await getChunkBySlug(slug);

  try {
    return await createPostBase({
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
    const errorKey = videoAttachmentErrorKeyForPgError(err);
    if (errorKey) {
      return { error: errorKey };
    }
    throw err;
  }
}
