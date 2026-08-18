/**
 * What every image-upload surface accepts, and how large a file it takes.
 *
 * `parse-upload.ts` explains why the *sequence* of checks is shared while the
 * allow-list and the cap are parameters: those two are the knobs that
 * legitimately differ per surface. This module is where those knobs get their
 * values, so that "differs per surface" never turns into "differs per file".
 *
 * The allow-list was written out five times — post images, admin images, the
 * avatar route, the avatar upload form, and the article editor's upload hook —
 * and the MIME → extension map three times. The two client copies are the ones
 * that mattered: the avatar form and the avatar route each had their own
 * literal, so relaxing the server without the client (or the reverse) would
 * reject a file the other side was happy to take, with no compile error.
 *
 * The list is mirrored once more in SQL, by the CHECK constraint on
 * `post_image_attachments`. That copy cannot import this one; changing the
 * allow-list means writing a migration too.
 *
 * Nothing here imports anything, so a Client Component can read it.
 */

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type ImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

/**
 * Whether a `File.type` (or any client-supplied string) names a format we
 * accept. A guard rather than a bare `.includes` because the allow-list is a
 * literal tuple: callers hold a `string` and want the narrowing.
 */
export function isAllowedImageMimeType(type: string): type is ImageMimeType {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(type);
}

/** Extension to store a given format under. Also mirrored by the DB CHECK. */
export const IMAGE_MIME_TO_EXTENSION: Record<ImageMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Per-file byte caps. Admin surfaces get more room than user-generated
 * content on purpose: an article body is written once by staff, a post image
 * arrives from anyone with an account.
 */
export const POST_IMAGE_MAX_FILE_SIZE = 2 * 1024 * 1024;
export const AVATAR_MAX_FILE_SIZE = 2 * 1024 * 1024;
export const ADMIN_IMAGE_MAX_FILE_SIZE = 5 * 1024 * 1024;
