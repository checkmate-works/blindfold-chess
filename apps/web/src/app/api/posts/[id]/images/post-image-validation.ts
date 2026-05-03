/**
 * Validation constants and helpers for post image uploads.
 *
 * @description
 * Intentionally separate from `apps/web/src/app/api/admin/articles/[id]/images/image-validation.ts`:
 * - Article images are admin-only and currently allow SVG (admin-only context,
 *   isolated Storage domain). Post images are user-uploaded UGC, so SVG is a
 *   hard reject (XSS / script-injection vector via inline `<script>`).
 * - Article images cap at 5 MB; post images cap at 2 MB.
 * - The MIME allow-list is therefore narrower here.
 *
 * Mixing the two via a shared module would force one set of constants on
 * both paths and risk a future relaxation on either side leaking to the
 * other. Keeping them separate is the safer default.
 *
 * @design Magic-byte verification (`validatePostImageBinarySignature`)
 *
 * The handler also checks the file's binary signature against the declared
 * `Content-Type`, so a request with `Content-Type: image/jpeg` but a payload
 * that doesn't start with `FF D8 FF` is rejected. This mitigates "MIME
 * spoofing" attacks where a uploader claims an image MIME but uploads a
 * different file type.
 */

export const POST_IMAGES_BUCKET = 'post-images';

export const POST_IMAGES_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type PostImageMimeType = (typeof POST_IMAGES_ALLOWED_MIME_TYPES)[number];

export const POST_IMAGES_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

/** Pixel cap (W*H) — decompression-bomb defense. Mirrors the DB CHECK. */
export const POST_IMAGES_MAX_MEGAPIXELS = 50_000_000;

/** Per-post cap. Mirrors the trigger constant `MAX_IMAGES_PER_POST`. */
export const MAX_IMAGES_PER_POST = 3;

export const POST_IMAGES_MIME_TO_EXTENSION: Record<PostImageMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Storage path layout: `${userId}/${postId}/${randomUuid}.${ext}`.
 * Mirrored exactly by the DB CHECK on `post_image_attachments.storage_path`.
 * The leaf MUST come from `crypto.randomUUID()` (NOT `Date.now()` —
 * predictable timestamps allow guessing other users' paths).
 */
export const POST_IMAGE_STORAGE_PATH_REGEX =
  /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

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
  const uuidRegex = /^[0-9a-f-]{36}$/;
  if (!uuidRegex.test(userId) || !uuidRegex.test(postId) || !uuidRegex.test(randomUuid)) {
    throw new Error('post_image_storage_path: invalid uuid input');
  }
  const ext = POST_IMAGES_MIME_TO_EXTENSION[contentType];
  return `${userId}/${postId}/${randomUuid}.${ext}`;
}

/**
 * Validate a binary signature ("magic bytes") against the declared MIME.
 * Returns true only when the buffer starts with the expected bytes for
 * the declared type. SVG is intentionally NOT supported.
 */
export function validatePostImageBinarySignature(
  buffer: ArrayBuffer,
  declaredType: string
): boolean {
  const header = new Uint8Array(buffer.slice(0, 12));

  if (declaredType === 'image/jpeg') {
    return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }
  if (declaredType === 'image/png') {
    return (
      header[0] === 0x89 &&
      header[1] === 0x50 &&
      header[2] === 0x4e &&
      header[3] === 0x47 &&
      header[4] === 0x0d &&
      header[5] === 0x0a &&
      header[6] === 0x1a &&
      header[7] === 0x0a
    );
  }
  if (declaredType === 'image/webp') {
    // WebP files start with "RIFF" + 4 bytes size + "WEBP"
    return (
      header[0] === 0x52 &&
      header[1] === 0x49 &&
      header[2] === 0x46 &&
      header[3] === 0x46 &&
      header[8] === 0x57 &&
      header[9] === 0x45 &&
      header[10] === 0x42 &&
      header[11] === 0x50
    );
  }

  // SVG / image/svg+xml / unknown: reject.
  return false;
}

export function isAllowedPostImageMimeType(value: unknown): value is PostImageMimeType {
  return (
    typeof value === 'string' &&
    (POST_IMAGES_ALLOWED_MIME_TYPES as readonly string[]).includes(value)
  );
}
