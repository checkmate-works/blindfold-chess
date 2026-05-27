import { POST_IMAGES_BUCKET } from './validation';

/**
 * Read-time public URL rebuild for post image attachments.
 *
 * @description
 * The `post_image_attachments` table intentionally does NOT persist a
 * `public_url` column (issue #73, H-3). The public URL is purely a
 * function of `(SUPABASE_URL, bucket, storage_path)`, so persisting it
 * is redundant and a drift risk. The renderer derives the URL on read.
 *
 * @design Why a tiny helper instead of `supabase.storage.getPublicUrl()`
 *
 * `getPublicUrl()` works only inside a request that has a Supabase client
 * handy. Some read paths (RSS feeds, OG-image generation, server
 * components that have already finished their auth handshake) construct
 * the URL outside any Supabase client — for those callers a pure
 * function that takes only the storage path is the simplest API.
 *
 * The URL shape is stable across Supabase versions:
 *   {SUPABASE_URL}/storage/v1/object/public/{bucket}/{storage_path}
 */

/**
 * Build the public URL for a `post_image_attachments.storage_path`.
 *
 * @param storagePath the column value, e.g. `${userId}/${postId}/${uuid}.jpg`
 * @param supabaseUrl the Supabase project URL (defaults to
 *   `process.env.NEXT_PUBLIC_SUPABASE_URL`). Must NOT include a trailing slash.
 *
 * Throws if the storage path traverses outside the bucket prefix
 * (e.g. starts with `/`, contains `..`, or is empty). Defense-in-depth
 * even though the column is regex-pinned at the DB.
 */
export function buildPostImagePublicUrl(
  storagePath: string,
  supabaseUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL
): string {
  if (!supabaseUrl) {
    throw new Error('post_image_public_url: NEXT_PUBLIC_SUPABASE_URL is not configured');
  }
  if (!isSafeStoragePath(storagePath)) {
    throw new Error('post_image_public_url: unsafe storage_path');
  }
  const trimmed = supabaseUrl.replace(/\/+$/, '');
  return `${trimmed}/storage/v1/object/public/${POST_IMAGES_BUCKET}/${storagePath}`;
}

/**
 * Reject path-traversal attempts and other unsafe shapes. Pure / unit-testable.
 *
 * Acceptable shapes pass `^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$`,
 * but the rebuild helper is also called for storage objects whose row may
 * have been written before the regex CHECK existed (none in MVP, but the
 * helper is safer-by-default). The check below rejects:
 *   - empty string
 *   - leading `/` (would point at `/post-images/...` and could escape via
 *     URL-level oddities)
 *   - any segment equal to `..` or `.` (path traversal)
 *   - empty segments (double slash)
 *   - backslashes (Windows-style separators)
 *   - any whitespace or control characters (canonical paths use only
 *     `[0-9a-f-]` segments + a known extension; whitespace is by
 *     definition out-of-shape)
 */
export function isSafeStoragePath(storagePath: string): boolean {
  if (typeof storagePath !== 'string' || storagePath.length === 0) return false;
  if (storagePath.startsWith('/')) return false;
  if (storagePath.includes('\\')) return false;
  // \s catches space, tab, newline, CR; the explicit char-code loop
  // below catches the rest of the C0 control range (NULL, BEL, etc.).
  // The loop is preferred over a regex character class containing
  // control bytes to keep ESLint's `no-control-regex` happy.
  if (/\s/.test(storagePath)) return false;
  for (let i = 0; i < storagePath.length; i++) {
    const code = storagePath.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return false;
  }
  // Reject any segment that is '..' or '.' (relative path resolution),
  // or empty (double-slash).
  const segments = storagePath.split('/');
  for (const seg of segments) {
    if (seg === '..' || seg === '.' || seg === '') return false;
  }
  return true;
}
