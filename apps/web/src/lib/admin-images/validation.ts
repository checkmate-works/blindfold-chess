/**
 * Upload *policy* for the admin-only image endpoints (article images and
 * ad-creative images): same allowed formats, same 5 MB cap.
 *
 * The magic-byte check itself is NOT policy and is not defined here — it
 * lives in `@/lib/images/binary-signature`, shared with the post-image and
 * avatar paths. `@/lib/post-images/validation` remains a separate module for
 * the same reason this one exists: post images are user-generated content
 * with a tighter 2 MB cap and their own storage-path rules. Those are the
 * knobs that legitimately differ per surface; the format check is not one.
 */
import { NextResponse } from 'next/server';

import { validateImageBinarySignature } from '@/lib/images/binary-signature';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

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
 * to stop a mislabelled file (see {@link validateImageBinarySignature}).
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
  if (!validateImageBinarySignature(buffer, file.type)) {
    return { error: NextResponse.json({ error: 'invalid_file_type' }, { status: 400 }) };
  }

  return { file, buffer, formData };
}
