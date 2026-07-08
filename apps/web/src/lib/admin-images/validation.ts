/**
 * Upload validation shared by the admin-only image endpoints (article images
 * and ad-creative images): same allowed formats, same 5 MB cap, same
 * magic-byte check. `@/lib/post-images/validation` stays deliberately
 * separate — post images are user-generated content with their own (stricter)
 * size cap and policy; see the note in that file.
 */

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Validate that a file's binary signature (magic bytes) matches the declared
 * MIME type. Returns true if the binary content matches one of the allowed
 * image types.
 *
 * SVG is intentionally NOT supported: SVG can embed <script> and event
 * handlers, and when served directly from the *.supabase.co origin,
 * navigation to the URL executes scripts. Only raster formats
 * (JPG/PNG/WebP) are needed by the admin surfaces.
 */
export function validateBinarySignature(buffer: ArrayBuffer, declaredType: string): boolean {
  const header = new Uint8Array(buffer.slice(0, 12));

  if (declaredType === 'image/jpeg') {
    return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }
  if (declaredType === 'image/png') {
    return header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  }
  if (declaredType === 'image/webp') {
    return header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
  }

  return false;
}
