import { NextResponse } from 'next/server';

import sharp from 'sharp';

import { SHARP_DECODE_OPTIONS } from '@/lib/images/sharp-options';
import type { createAdminClient } from '@/lib/supabase/admin';

import { buildAdminImageStoragePath } from './validation';

type AdminStorageClient = ReturnType<typeof createAdminClient>;

export type ProcessAndUploadAdminImageInput = {
  /** The service-role client the caller keeps for its own rollback / cleanup. */
  supabase: AdminStorageClient;
  bucket: string;
  /** The record the image belongs to — its folder in the bucket. */
  ownerId: string;
  /** The validated upload, as `parseAdminImageUpload` returned it. */
  file: File;
  buffer: ArrayBuffer;
  /** Long-edge cap in pixels; smaller images are left at their size. */
  maxLongEdge: number;
};

export type ProcessAndUploadAdminImageResult =
  | {
      ok: true;
      storagePath: string;
      publicUrl: string;
      /** Bytes actually written to Storage — the re-encoded size, not the upload's. */
      byteLength: number;
    }
  | { ok: false; response: NextResponse };

/**
 * Normalise a validated admin image and put it in Storage: rotate (bake in
 * EXIF orientation, strip metadata), cap the long edge, re-encode in the
 * source format, upload under a fresh per-owner path, and resolve the public
 * URL. Every accepted admin image is a raster (the MIME allow-list and
 * magic-byte check in `parseAdminImageUpload` reject SVG before this runs).
 *
 * A decode failure is reported as an invalid file (400): `limitInputPixels`
 * in {@link SHARP_DECODE_OPTIONS} rejects a decompression bomb before the
 * full decode, and `failOn: 'error'` refuses a truncated or crafted file
 * rather than storing a partial decode. A Storage failure is a 500.
 *
 * What happens next — the row write and the rollback that removes the
 * object when it fails — stays with the endpoint, because that is where the
 * two admin image routes genuinely differ (an update on the creative vs. an
 * insert of an article image row). The pipeline up to the public URL was
 * identical in both and is the part worth not letting drift.
 */
export async function processAndUploadAdminImage({
  supabase,
  bucket,
  ownerId,
  file,
  buffer,
  maxLongEdge,
}: ProcessAndUploadAdminImageInput): Promise<ProcessAndUploadAdminImageResult> {
  let processed: Buffer;
  try {
    processed = await sharp(Buffer.from(buffer), SHARP_DECODE_OPTIONS)
      .rotate()
      .resize(maxLongEdge, maxLongEdge, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: 'invalid_file_type' }, { status: 400 }),
    };
  }

  const storagePath = buildAdminImageStoragePath(ownerId, file.type);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, processed, { contentType: file.type, upsert: false });
  if (uploadError) {
    return { ok: false, response: NextResponse.json({ error: 'upload_failed' }, { status: 500 }) };
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);

  return { ok: true, storagePath, publicUrl: urlData.publicUrl, byteLength: processed.byteLength };
}
