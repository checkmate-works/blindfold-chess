'use server';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { db, postVideoAttachments } from '@/lib/db';
import { parseYouTubeUrl } from '@/lib/games/youtube-validator';
import {
  SOURCE_URL_MAX_LENGTH,
  reasonToErrorKey,
  videoAttachmentErrorKeyForPgError,
} from '@/lib/post-video-attachment';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { loadAuthoredPost } from '@/lib/topic-posts';

/**
 * Server Action: attach a YouTube video to an existing topic post.
 *
 * @description
 * 1:0..1 attachment per post (`UNIQUE(post_id)` at the DB). Validation
 * order:
 *   1. trim + length pre-check (canonicalization once, see below)
 *   2. auth + ban + rate limit guard
 *   3. parent-post ownership + soft-delete check
 *   4. URL parse + provider-specific id extraction
 *   5. DB INSERT with explicit field projection
 *
 * Returns explicit field shape — does NOT spread `inferSelect` to avoid
 * leaking columns the caller did not ask for. Mirrors `attachPostFen`'s
 * posture.
 *
 * @design Trim canonicalization (Lessons §10)
 *
 * The URL is trimmed once at the top so the parser, length pre-check,
 * and INSERT all see the same canonical value. The parser does NOT
 * trim internally (its TSDoc spells this contract out), and the DB
 * CHECK regexes are anchored, so without a single canonical trim point
 * a whitespace-padded URL would pass the validator and then trip the
 * CHECK constraint, leaking a `23514` to the user.
 *
 * @design SQLSTATE mapping (Lessons §11)
 *
 * `extractPgErrorCode` (canonical helper, walks `err.cause`) recovers
 * the SQLSTATE from Drizzle's wrapper Error. The three branches are:
 *   - `23505` (unique_violation) → `alreadyAttached`
 *   - `23514` (check_violation) → `invalidVideoStructure`
 *   - `22001` (string_data_right_truncation) → `tooLong`
 * The 22001 branch is practically unreachable behind the app-layer
 * length pre-check, but it is the defense-in-depth fallback if a
 * column ever shrinks via migration without a matching pre-check
 * tightening.
 *
 * @design `youtube-nocookie.com` is render-only
 *
 * The renderer rebuilds the iframe `src` from
 * `(provider, providerVideoId)` via the `youtube-nocookie.com` host —
 * see `VideoEmbed.tsx`. The `sourceUrl` persisted here is audit-only
 * and is NEVER passed to the iframe. This mirrors the Lichess embed
 * pattern (validated id at write time, reconstructed src at read time).
 */
export async function attachPostVideo(input: { postId: string; url: string }): Promise<
  ActionResult<{
    attachment: {
      id: string;
      provider: string;
      providerVideoId: string;
      sourceUrl: string | null;
      title: string | null;
      thumbnailUrl: string | null;
      createdAt: Date;
    };
  }>
> {
  const { postId, url: rawUrlInput } = input;

  // Canonicalize URL by trimming once at the top. Both the parser and
  // the DB CHECK are anchored, so passing untrimmed input would mean
  // the validator sees one value and the INSERT sees another — see the
  // trim contract in the file-level TSDoc.
  const rawUrl = typeof rawUrlInput === 'string' ? rawUrlInput.trim() : '';

  if (rawUrl.length === 0) {
    return { error: 'postVideoAttachment.error.urlRequired' };
  }
  if (rawUrl.length > SOURCE_URL_MAX_LENGTH) {
    return { error: 'postVideoAttachment.error.inputTooLong' };
  }

  const guardResult = await authenticateAndGuard(RATE_LIMITS.attachPostVideo);
  if ('error' in guardResult) {
    return { error: guardResult.error };
  }
  const { user } = guardResult;

  // Parent-post existence + ownership + not soft-deleted. Same posture
  // as `attachPostFen` — a soft-deleted post is reported as postNotFound.
  const lookup = await loadAuthoredPost(postId, user.id);
  if ('error' in lookup) {
    return {
      error:
        lookup.error === 'unauthorized'
          ? 'postVideoAttachment.error.notOwner'
          : 'postVideoAttachment.error.postNotFound',
    };
  }
  const { post } = lookup;

  const parseResult = parseYouTubeUrl(rawUrl);
  if (!parseResult.ok) {
    return { error: reasonToErrorKey(parseResult.reason) };
  }
  const { provider, providerVideoId, sourceUrl } = parseResult.value;

  try {
    const [row] = await db
      .insert(postVideoAttachments)
      .values({
        postId: post.id,
        provider,
        providerVideoId,
        sourceUrl,
      })
      .returning({
        id: postVideoAttachments.id,
        provider: postVideoAttachments.provider,
        providerVideoId: postVideoAttachments.providerVideoId,
        sourceUrl: postVideoAttachments.sourceUrl,
        title: postVideoAttachments.title,
        thumbnailUrl: postVideoAttachments.thumbnailUrl,
        createdAt: postVideoAttachments.createdAt,
      });

    return {
      success: true,
      attachment: {
        id: row.id,
        provider: row.provider,
        providerVideoId: row.providerVideoId,
        sourceUrl: row.sourceUrl,
        title: row.title,
        thumbnailUrl: row.thumbnailUrl,
        createdAt: row.createdAt,
      },
    };
  } catch (err) {
    const errorKey = videoAttachmentErrorKeyForPgError(err);
    if (errorKey) {
      return { error: errorKey };
    }
    throw err;
  }
}
