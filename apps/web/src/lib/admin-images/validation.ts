/**
 * Upload *policy* for the admin-only image endpoints (article images and
 * ad-creative images): same allowed formats, same 5 MB cap.
 *
 * Neither the magic-byte check nor the parse sequence is defined here — both
 * are surface-independent and live in `@/lib/images`, shared with the avatar
 * and post-image paths. `@/lib/post-images/validation` remains a separate
 * module for the same reason this one exists: post images are user-generated
 * content with a tighter 2 MB cap and their own storage-path rules. Those are
 * the knobs that legitimately differ per surface; the gate is not one.
 */
import type { ParsedImageUpload } from '@/lib/images/parse-upload';
import { parseImageUpload } from '@/lib/images/parse-upload';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * {@link parseImageUpload} bound to the admin policy above. Both admin
 * endpoints go through this so neither can drift from the other's allow-list
 * or cap.
 */
export function parseAdminImageUpload(request: Request): Promise<ParsedImageUpload> {
  return parseImageUpload(request, {
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    maxFileSize: MAX_FILE_SIZE,
  });
}
