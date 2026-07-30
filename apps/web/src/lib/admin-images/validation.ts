/**
 * Upload validation shared by the admin-only image endpoints (article images
 * and ad-creative images): same allowed formats, same 5 MB cap, same
 * magic-byte check. `@/lib/post-images/validation` stays deliberately
 * separate — post images are user-generated content with their own (stricter)
 * size cap and policy; see the note in that file.
 */
import { NextResponse } from 'next/server';

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

/**
 * Read an admin image upload off a multipart request and run the full gate:
 * the form parses, a file is present, its declared MIME type is allowed, it is
 * within the size cap, and its magic bytes match what it claims to be. Order
 * matters — the cheap checks run before the body is buffered.
 *
 * Returns `{ error }` with the response to send, or the file plus its buffered
 * bytes and the surrounding `formData`, so each endpoint can read whatever
 * extra field it needs (the ad endpoint a `target`, the article endpoint an
 * `altText`) without re-parsing.
 *
 * Both admin endpoints ran this identical sequence separately. Keeping one copy
 * matters more here than the line count: a check silently missing from one
 * endpoint is a file-upload hole, and the magic-byte step exists specifically
 * to stop a mislabelled file (see {@link validateBinarySignature}).
 */
export async function parseAdminImageUpload(
  request: Request
): Promise<
  | { error: NextResponse }
  | { error?: undefined; file: File; buffer: ArrayBuffer; formData: FormData }
> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return { error: NextResponse.json({ error: 'invalid_form_data' }, { status: 400 }) };
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { error: NextResponse.json({ error: 'file_required' }, { status: 400 }) };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { error: NextResponse.json({ error: 'invalid_file_type' }, { status: 400 }) };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: NextResponse.json({ error: 'file_too_large' }, { status: 400 }) };
  }

  const buffer = await file.arrayBuffer();
  if (!validateBinarySignature(buffer, file.type)) {
    return { error: NextResponse.json({ error: 'invalid_file_type' }, { status: 400 }) };
  }

  return { file, buffer, formData };
}
