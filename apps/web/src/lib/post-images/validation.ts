/**
 * Validation constants and helpers for post image uploads.
 *
 * @description
 * Intentionally separate from the admin upload policy in
 * `@/lib/admin-images/validation`: post images are user-uploaded UGC and cap
 * at 2 MB, admin images at 5 MB, and only this path owns the storage-path
 * layout that RLS and a DB CHECK pin. Merging the two would force one set of
 * constants on both and risk a future relaxation on either side leaking to
 * the other.
 *
 * What is NOT duplicated across the two is the magic-byte check: both import
 * `validateImageBinarySignature` from `@/lib/images/binary-signature`. That
 * one is a fact about image formats rather than a per-surface policy, and
 * when it did exist twice the admin copy silently drifted weaker. See that
 * module's TSDoc.
 *
 * The same distinction applies to the accepted formats and the extension they
 * are stored under: those are facts about images, not decisions this surface
 * makes, so they come from `@/lib/images/policy` — which is also where the
 * caps live, one named constant per surface. What this module owns is the
 * choice of WHICH cap applies here, plus the storage-path rules below.
 *
 * @design Module location
 *
 * Lives under `src/lib/post-images/` (alongside the Sharp helpers and the
 * reaper) rather than under `src/app/api/posts/[id]/images/` so that the
 * dependency direction stays "lib ← app", not "lib → app". The route
 * handler at `src/app/api/posts/[id]/images/route.ts` re-exports from here
 * for any external consumers that still reach into the API folder, but
 * the source of truth is THIS file.
 */
import {
  ALLOWED_IMAGE_MIME_TYPES,
  IMAGE_MIME_TO_EXTENSION,
  type ImageMimeType,
  POST_IMAGE_MAX_FILE_SIZE,
} from '@/lib/images/policy';
import { MAX_DECODE_PIXELS } from '@/lib/images/sharp-options';

export const POST_IMAGES_BUCKET = 'post-images';

export const POST_IMAGES_ALLOWED_MIME_TYPES = ALLOWED_IMAGE_MIME_TYPES;

export type PostImageMimeType = ImageMimeType;

export const POST_IMAGES_MAX_FILE_SIZE = POST_IMAGE_MAX_FILE_SIZE;

/**
 * Pixel cap (W*H) for a stored post image, mirroring the DB CHECK on
 * `post_images`.
 *
 * The same number as the app-wide decode budget, and deliberately so — but it
 * is named here as well because this one has a second obligation: a value that
 * disagrees with the CHECK constraint would fail the INSERT after the upload
 * has already been transcoded and stored.
 */
export const POST_IMAGES_MAX_MEGAPIXELS = MAX_DECODE_PIXELS;

/** Per-post cap. Mirrors the trigger constant `MAX_IMAGES_PER_POST`. */
export const MAX_IMAGES_PER_POST = 3;

export const POST_IMAGES_MIME_TO_EXTENSION = IMAGE_MIME_TO_EXTENSION;

/**
 * Storage path layout: `${userId}/${postId}/${randomUuid}.${ext}`.
 * Mirrored exactly by the DB CHECK on `post_image_attachments.storage_path`.
 * The leaf MUST come from `crypto.randomUUID()` (NOT `Date.now()` —
 * predictable timestamps allow guessing other users' paths).
 *
 * Each segment is locked to the canonical 8-4-4-4-12 UUID layout so
 * defense-in-depth: a path like `aaaa----...` (36 hex/dash chars in the
 * wrong shape) cannot pass even if the upstream UUID generator were
 * swapped for something looser.
 */
const UUID_CANONICAL_REGEX_FRAGMENT =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export const POST_IMAGE_STORAGE_PATH_REGEX = new RegExp(
  `^${UUID_CANONICAL_REGEX_FRAGMENT}/${UUID_CANONICAL_REGEX_FRAGMENT}/${UUID_CANONICAL_REGEX_FRAGMENT}\\.(jpg|png|webp)$`
);

/**
 * Build a storage path under the post-images bucket.
 *
 * Throws if any of the inputs is not a valid UUID v4 (lower-cased) — a
 * defensive check so a caller cannot accidentally pass a spoofed userId
 * (e.g., from FormData) and produce a path that would later fail the
 * Storage RLS check or the DB CHECK.
 */
export function buildPostImageStoragePath(args: {
  userId: string;
  postId: string;
  randomUuid: string;
  contentType: PostImageMimeType;
}): string {
  const { userId, postId, randomUuid, contentType } = args;
  const uuidRegex = new RegExp(`^${UUID_CANONICAL_REGEX_FRAGMENT}$`);
  if (!uuidRegex.test(userId) || !uuidRegex.test(postId) || !uuidRegex.test(randomUuid)) {
    throw new Error('post_image_storage_path: invalid uuid input');
  }
  const ext = POST_IMAGES_MIME_TO_EXTENSION[contentType];
  return `${userId}/${postId}/${randomUuid}.${ext}`;
}

export function isAllowedPostImageMimeType(value: unknown): value is PostImageMimeType {
  return (
    typeof value === 'string' &&
    (POST_IMAGES_ALLOWED_MIME_TYPES as readonly string[]).includes(value)
  );
}
