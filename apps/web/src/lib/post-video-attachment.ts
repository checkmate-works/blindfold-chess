import { extractPgErrorCode } from '@/lib/db/extract-pg-error-code';
import type { YouTubeUrlReason } from '@/lib/games/youtube-validator';

/**
 * Maximum length of a stored source URL. Mirrors
 * `post_video_attachments.source_url` column width and matches the URL
 * parser's `MAX_INPUT_LENGTH`. The DB-level CHECK is the last line of
 * defense.
 */
export const SOURCE_URL_MAX_LENGTH = 512;

/**
 * Map a YouTube URL parser failure reason to its localized error key
 * under the `postVideoAttachment.error.*` namespace. The mapping is
 * exhaustive and a compile-time guard at the bottom catches any new
 * reason added to `YouTubeUrlReason` without an explicit entry here.
 */
export function reasonToErrorKey(reason: YouTubeUrlReason): string {
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
 * Map a Drizzle-wrapped Postgres failure from a `post_video_attachments`
 * INSERT to a localized error key, or `undefined` when the SQLSTATE is not
 * one this layer handles (the caller should rethrow in that case).
 *
 * `extractPgErrorCode` (canonical helper, walks `err.cause`) recovers the
 * SQLSTATE from Drizzle's wrapper Error. Branches:
 *   - `23505` (unique_violation) → `alreadyAttached`
 *   - `23514` (check_violation) → `invalidVideoStructure`
 *   - `22001` (string_data_right_truncation) → `tooLong`
 *
 * The `23514` and `22001` branches are practically unreachable behind the
 * URL parser and the app-layer length pre-check; they are defense-in-depth
 * for a DB CHECK / column width drifting ahead of the app-side guards.
 * Triage points if `23514` ever fires:
 *   - JS regex / parser:
 *       apps/web/src/lib/games/youtube-validator.ts
 *       apps/web/src/lib/games/youtube-validator.test.ts
 *   - DB CHECK source (constraints `post_video_attachments_chk_*`):
 *       apps/web/drizzle/20260504080000_create_post_video_attachments.sql
 *       apps/web/src/lib/db/schema/tables.ts (postVideoAttachments)
 */
export function videoAttachmentErrorKeyForPgError(err: unknown): string | undefined {
  const code = extractPgErrorCode(err);
  if (code === '23505') {
    return 'postVideoAttachment.error.alreadyAttached';
  }
  if (code === '23514') {
    return 'postVideoAttachment.error.invalidVideoStructure';
  }
  if (code === '22001') {
    return 'postVideoAttachment.error.tooLong';
  }
  return undefined;
}
