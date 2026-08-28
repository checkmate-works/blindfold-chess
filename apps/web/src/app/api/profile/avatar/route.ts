import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';
import sharp from 'sharp';

import { guardApiMutation } from '@/lib/api-mutation-guard';
import { profileCacheTag } from '@/lib/cache-tags';
import { db, profiles } from '@/lib/db';
import { parseImageUpload } from '@/lib/images/parse-upload';
import { ALLOWED_IMAGE_MIME_TYPES, AVATAR_MAX_FILE_SIZE } from '@/lib/images/policy';
import { SHARP_DECODE_OPTIONS } from '@/lib/images/sharp-options';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { logActivityEvent } from '@/lib/users/activity-log';
import { AVATAR_BUCKET, avatarFilePath, removeAllAvatarFiles } from '@/lib/users/avatar-storage';

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

  const filePath = avatarFilePath(user.id);

  // Clear the folder before writing. `upsert` alone only replaces the object
  // at `filePath`; avatars uploaded before the fixed-name convention carry
  // the source extension and would survive untouched.
  await removeAllAvatarFiles(supabase, user.id);

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, processed, {
      contentType: 'image/webp',
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);

  // Append timestamp to bust cache when avatar is updated
  const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  const [updated] = await db
    .update(profiles)
    .set({ avatarUrl, updatedAt: new Date() })
    .where(eq(profiles.id, user.id))
    .returning({ username: profiles.username });

  // The avatar is part of the cached public-profile row (`profileCacheTag`),
  // so a new upload has to expire it — the cache-busting `?t=` on the URL only
  // helps once the new URL is actually served.
  if (updated) {
    revalidateTag(profileCacheTag(updated.username), { expire: 0 });
  }

  return NextResponse.json({ avatarUrl });
}

/**
 * Clears the viewer's avatar: `profiles.avatar_url` back to NULL and the
 * Storage objects removed, so the UI falls back to the default silhouette.
 *
 * Ordering matters. The row is updated first and Storage second: if the
 * Storage call then fails, what survives is an object nothing references —
 * invisible, and overwritten by the next upload. The reverse order fails the
 * other way, leaving `avatar_url` pointing at a deleted object, which renders
 * as a broken image everywhere an avatar appears until the user uploads again.
 *
 * Succeeds when there is no avatar to remove. A no-op DELETE and a real one
 * are indistinguishable to the caller by design — the client only knows the
 * avatar it last rendered, which may already be stale, and reporting "nothing
 * to delete" would surface a race as an error for a request whose
 * postcondition ("this user has no avatar") already holds.
 */
export async function DELETE(request: Request) {
  const guardResult = await guardApiMutation(request, RATE_LIMITS.deleteAvatar);
  if ('response' in guardResult) {
    return guardResult.response;
  }
  const { user } = guardResult;

  const supabase = await createClient();

  const [updated] = await db
    .update(profiles)
    .set({ avatarUrl: null, updatedAt: new Date() })
    .where(eq(profiles.id, user.id))
    .returning({ username: profiles.username });

  if (updated) {
    revalidateTag(profileCacheTag(updated.username), { expire: 0 });
  }

  await removeAllAvatarFiles(supabase, user.id);

  // A removal is logged where the upload is not, and the asymmetry is the
  // point: an upload leaves its own evidence (the object, and the URL on the
  // row), while a removal destroys both and leaves the profile
  // indistinguishable from one that never had a picture. Without this entry
  // there would be no record that an image ever existed — the same
  // "overwritten value is unrecoverable" reasoning that puts profile edits in
  // the log. The old URL is deliberately not recorded: the object behind it is
  // gone, so it would preserve nothing but a dead link.
  logActivityEvent({
    userId: user.id,
    action: 'delete_avatar',
    targetType: 'user',
    targetId: user.id,
  });

  return NextResponse.json({ success: true });
}
