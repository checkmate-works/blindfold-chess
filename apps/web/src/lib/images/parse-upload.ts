import { NextResponse } from 'next/server';

import { validateImageBinarySignature } from '@/lib/images/binary-signature';

export type ImageUploadPolicy = {
  /** Declared MIME types this surface accepts. */
  allowedMimeTypes: readonly string[];
  /** Per-file byte cap. */
  maxFileSize: number;
};

export type ParsedImageUpload =
  | { error: NextResponse }
  | { error?: undefined; file: File; buffer: ArrayBuffer; formData: FormData };

/**
 * Read a single-image multipart upload off a request and run the full gate:
 * the form parses, a `file` field is present and is a File, its declared MIME
 * type is on the caller's allow-list, it is within the caller's size cap, and
 * its magic bytes match what it claims to be.
 *
 * Order matters — every cheap check runs before the body is buffered, so a
 * request that fails on its declared type never materializes its bytes.
 *
 * Returns `{ error }` carrying the response to send, or the file plus its
 * buffered bytes and the surrounding `formData`, so each endpoint can read
 * whatever extra field it needs (a `target`, an `altText`) without
 * re-parsing.
 *
 * @design Why the sequence is shared but the policy is not
 *
 * The admin endpoints and the avatar endpoint each hand-rolled these five
 * steps. That is the shape of bug worth designing against: a step silently
 * missing from one endpoint is a file-upload hole, and nothing about a route
 * makes it obvious that a check is absent. What legitimately differs between
 * surfaces is only the allow-list and the cap, so those are the parameters —
 * everything else is the same gate.
 *
 * The post-image endpoint deliberately does NOT use this. It refuses on
 * `Content-Length` before parsing at all, answers 413 rather than 400 for an
 * oversized file, rejects zero-byte files, and returns the accepted-type list
 * in its error body. Those are real differences in its API contract; folding
 * them in would mean status codes and body shapes as arguments, which is the
 * signal that it is a second thing rather than a variant of this one. It
 * shares {@link validateImageBinarySignature} directly.
 */
export async function parseImageUpload(
  request: Request,
  policy: ImageUploadPolicy
): Promise<ParsedImageUpload> {
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
  if (!policy.allowedMimeTypes.includes(file.type)) {
    return { error: NextResponse.json({ error: 'invalid_file_type' }, { status: 400 }) };
  }
  if (file.size > policy.maxFileSize) {
    return { error: NextResponse.json({ error: 'file_too_large' }, { status: 400 }) };
  }

  const buffer = await file.arrayBuffer();
  if (!validateImageBinarySignature(buffer, file.type)) {
    return { error: NextResponse.json({ error: 'invalid_file_type' }, { status: 400 }) };
  }

  return { file, buffer, formData };
}
