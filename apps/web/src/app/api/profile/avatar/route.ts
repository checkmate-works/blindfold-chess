import { NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';
import sharp from 'sharp';

import { guardApiMutation } from '@/lib/api-mutation-guard';
import { db, profiles } from '@/lib/db';
import { parseImageUpload } from '@/lib/images/parse-upload';
import { ALLOWED_IMAGE_MIME_TYPES, AVATAR_MAX_FILE_SIZE } from '@/lib/images/policy';
import { SHARP_DECODE_OPTIONS } from '@/lib/images/sharp-options';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { createClient } from '@/lib/supabase/server';

/**
 * Pre-resize dimensions for stored avatars. 256×256 covers retina up to a
 * 128 px display, which is well above the largest spot we render an avatar
 * (currently the 64 px `lg` UserAvatar variant). Storing a fixed-size WebP
 * lets the avatar image be served `unoptimized` on the client, eliminating
 * Vercel Image Optimization Transformation usage for user avatars.
 */
const AVATAR_PIXEL_SIZE = 256;
const AVATAR_WEBP_QUALITY = 85;

export async function POST(request: Request) {
  const guardResult = await guardApiMutation(request, RATE_LIMITS.uploadAvatar);
  if ('response' in guardResult) {
    return guardResult.response;
  }
  const { user } = guardResult;

  const supabase = await createClient();

  // Parse + allow-list + size cap + magic-byte check, in that order. Shared
  // with the admin image endpoints so the avatar path cannot quietly lose a
  // step; only the allow-list and cap are ours.
  const upload = await parseImageUpload(request, {
    allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
    maxFileSize: AVATAR_MAX_FILE_SIZE,
  });
  if (upload.error) {
    return upload.error;
  }
  const { buffer } = upload;

  // Resize to a square WebP. `.rotate()` bakes in EXIF orientation and then
  // strips ALL EXIF / GPS metadata (Sharp's documented default for
  // `.toBuffer()` when `.withMetadata()` is not called). `failOn: 'error'`
  // rejects malformed input early, and `pages: 1` caps decode memory so a
  // crafted animated WebP cannot blow up libvips. `limitInputPixels` rejects
  // a decompression bomb (a highly compressible huge-dimension image that
  // sits under the 2 MB byte cap but would decode to ~GBs) before the full
  // decode — same 50 MP policy the post-image path enforces via its probe.
  let processed: Buffer;
  try {
    processed = await sharp(Buffer.from(buffer), SHARP_DECODE_OPTIONS)
      .rotate()
      .resize(AVATAR_PIXEL_SIZE, AVATAR_PIXEL_SIZE, { fit: 'cover' })
      .webp({ quality: AVATAR_WEBP_QUALITY })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: 'invalid_file_type' }, { status: 400 });
  }

  const filePath = `${user.id}/avatar.webp`;

  const { data: existingFiles } = await supabase.storage.from('avatars').list(user.id);
  if (existingFiles?.length) {
    await supabase.storage.from('avatars').remove(existingFiles.map((f) => `${user.id}/${f.name}`));
  }

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, processed, {
      contentType: 'image/webp',
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);

  // Append timestamp to bust cache when avatar is updated
  const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  await db
    .update(profiles)
    .set({ avatarUrl, updatedAt: new Date() })
    .where(eq(profiles.id, user.id));

  return NextResponse.json({ avatarUrl });
}
