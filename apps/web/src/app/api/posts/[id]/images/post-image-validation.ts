/**
 * Backwards-compatible re-export shim.
 *
 * The source of truth for post-image validation constants and helpers
 * moved to `src/lib/post-images/validation.ts` so the dependency
 * direction goes "lib ← app", not "lib → app". This file remains as a
 * thin re-export so any external callers that still import from the API
 * folder keep working.
 *
 * New imports should reference `@/lib/post-images/validation` directly.
 *
 * The magic-byte validator is no longer re-exported here: it moved to
 * `@/lib/images/binary-signature` when the post and admin upload paths were
 * collapsed onto one implementation.
 */
export {
  MAX_IMAGES_PER_POST,
  POST_IMAGES_ALLOWED_MIME_TYPES,
  POST_IMAGES_BUCKET,
  POST_IMAGES_MAX_FILE_SIZE,
  POST_IMAGES_MAX_MEGAPIXELS,
  POST_IMAGES_MIME_TO_EXTENSION,
  POST_IMAGE_STORAGE_PATH_REGEX,
  buildPostImageStoragePath,
  isAllowedPostImageMimeType,
} from '@/lib/post-images/validation';
export type { PostImageMimeType } from '@/lib/post-images/validation';
