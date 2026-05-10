'use server';

import { eq } from 'drizzle-orm';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { db, postVideoAttachments, topicPosts } from '@/lib/db';
import { extractPgErrorCode } from '@/lib/db/extract-pg-error-code';
import { parseYouTubeUrl } from '@/lib/games/youtube-validator';
import type { YouTubeUrlReason } from '@/lib/games/youtube-validator';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * Maximum length of a stored source URL. Mirrors
 * `post_video_attachments.source_url` column width and matches the URL
 * parser's `MAX_INPUT_LENGTH`. The DB-level CHECK is the last line of
 * defense.
 */
const SOURCE_URL_MAX_LENGTH = 512;

/**
 * Map a YouTube URL parser failure reason to its localized error key
 * under the `postVideoAttachment.error.*` namespace. The mapping is
 * exhaustive and a compile-time guard at the bottom catches any new
 * reason added to `YouTubeUrlReason` without an explicit entry here.
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
      const _exhaustive: never = reason;
      void _exhaustive;
      return 'postVideoAttachment.error.invalidUrl';
    }
  }
}

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
  // as `attachPostFen`.
  const [post] = await db
    .select({
      id: topicPosts.id,
      userId: topicPosts.userId,
      deletedAt: topicPosts.deletedAt,
    })
    .from(topicPosts)
    .where(eq(topicPosts.id, postId))
    .limit(1);

  if (!post) {
    return { error: 'postVideoAttachment.error.postNotFound' };
  }
  if (post.userId !== user.id) {
    return { error: 'postVideoAttachment.error.notOwner' };
  }
  if (post.deletedAt !== null) {
    return { error: 'postVideoAttachment.error.postNotFound' };
  }

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
    const code = extractPgErrorCode(err);
    if (code === '23505') {
      return { error: 'postVideoAttachment.error.alreadyAttached' };
    }
    if (code === '23514') {
      // CHECK violation — defense-in-depth. The URL parser above
      // catches every condition the DB CHECK could trip on, so this
      // branch is practically unreachable from the action layer; it
      // exists in case the CHECK ever drifts ahead of the app-side
      // regex. Triage points if this ever fires:
      //   - JS regex / parser:
      //       apps/web/src/lib/games/youtube-validator.ts
      //       apps/web/src/lib/games/youtube-validator.test.ts
      //   - DB CHECK source (constraints
      //       `post_video_attachments_chk_provider`,
      //       `post_video_attachments_chk_provider_video_id`,
      //       `post_video_attachments_chk_source_url`,
      //       `post_video_attachments_chk_thumbnail_url`):
      //       apps/web/drizzle/20260504080000_create_post_video_attachments.sql
      //       apps/web/src/lib/db/schema/tables.ts (postVideoAttachments)
      return { error: 'postVideoAttachment.error.invalidVideoStructure' };
    }
    if (code === '22001') {
      // string_data_right_truncation — value exceeded a varchar width.
      // The app-layer length pre-check on `rawUrl` already guards
      // against this for the URL field, so this is defense-in-depth.
      return { error: 'postVideoAttachment.error.tooLong' };
    }
    throw err;
  }
}
