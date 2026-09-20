import { NextResponse } from 'next/server';

import { revalidateAdCreatives } from '@/app/admin/ads/_lib/revalidate';
import { AD_CREATIVES_BUCKET, storagePathFromPublicUrl } from '@/app/admin/ads/_lib/storage';
import { AD_CREATIVE_LIMITS } from '@/app/admin/ads/_lib/validation';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';

import { MIME_TO_EXTENSION, parseAdminImageUpload } from '@/lib/admin-images/validation';
import { DEFAULT_AD_ALT } from '@/lib/ads/thumbnail';
import { guardAdminApiMutation } from '@/lib/api-mutation-guard';
import { adCreatives, db } from '@/lib/db';
import { SHARP_DECODE_OPTIONS } from '@/lib/images/sharp-options';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { persistWithUploadRollback } from '@/lib/supabase/persist-with-upload-rollback';

type ImageTarget = 'avatar' | 'thumbnail';

/**
 * Long-edge resize caps per upload target. The avatar renders small (32px, 2×
 * DPR = 64); the thumbnail fills the card's board slot, so it gets more room.
 */
const MAX_LONG_EDGE: Record<ImageTarget, number> = {
  avatar: 256,
  thumbnail: 512,
};

/** Strict: an unrecognized target must 400, not silently overwrite the avatar. */
function parseTarget(value: unknown): ImageTarget | null {
  return value === 'avatar' || value === 'thumbnail' ? value : null;
}

/** The image columns of one creative, and the kind that decides which apply. */
type CreativeImages = {
  kind: string;
  avatarImagePath: string | null;
  avatarAlt: string | null;
  thumbnailImagePath: string | null;
  thumbnailImageAlt: string | null;
};

/** The creative's image columns — or the 404. */
async function loadCreativeImages(id: string): Promise<NextResponse | CreativeImages> {
  const [row] = await db
    .select({
      kind: adCreatives.kind,
      avatarImagePath: adCreatives.avatarImagePath,
      avatarAlt: adCreatives.avatarAlt,
      thumbnailImagePath: adCreatives.thumbnailImagePath,
      thumbnailImageAlt: adCreatives.thumbnailImageAlt,
    })
    .from(adCreatives)
    .where(eq(adCreatives.id, id))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return row;
}

/**
 * Every kind has a thumbnail; only a card has an avatar, and the row
 * constraint would reject one on a tile, so that case is refused with a
 * reason rather than left to surface as a constraint name.
 */
function refuseTargetForKind(row: CreativeImages, target: ImageTarget): NextResponse | null {
  if (target === 'avatar' && row.kind !== 'native_card') {
    return NextResponse.json({ error: 'unsupported_kind' }, { status: 400 });
  }
  return null;
}

/** The image URL the target currently points at (`''` when unset). */
function currentImageUrl(row: CreativeImages, target: ImageTarget): string {
  return (target === 'thumbnail' ? row.thumbnailImagePath : row.avatarImagePath) ?? '';
}

/**
 * The columns that give the target its new image, or clear it when
 * `imagePath` is null. An image and its alt are stored as a pair, so setting
 * one sets both: the alt the form sent with the upload, else the one already
 * on the row, else the default. Clearing the thumbnail image leaves the board
 * `fen` alone — the image was an override on top of it.
 */
function targetImageColumns(
  row: CreativeImages,
  target: ImageTarget,
  imagePath: string | null,
  alt: string | null
): Partial<CreativeImages> {
  if (target === 'avatar') {
    return imagePath
      ? { avatarImagePath: imagePath, avatarAlt: alt ?? row.avatarAlt ?? DEFAULT_AD_ALT }
      : { avatarImagePath: null, avatarAlt: null };
  }
  return imagePath
    ? {
        thumbnailImagePath: imagePath,
        thumbnailImageAlt: alt ?? row.thumbnailImageAlt ?? DEFAULT_AD_ALT,
      }
    : { thumbnailImagePath: null, thumbnailImageAlt: null };
}

/** The optional alt sent with the file; blank counts as not sent. */
function parseAlt(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const alt = value.trim();
  return alt.length > 0 && alt.length <= AD_CREATIVE_LIMITS.alt ? alt : null;
}

/** The shared admin-image gate, plus this endpoint's own `target` and `alt` fields. */
async function parseAndValidateFile(request: Request) {
  const upload = await parseAdminImageUpload(request);
  if (upload.error) return { error: upload.error } as const;

  const target = parseTarget(upload.formData.get('target'));
  if (!target) {
    return { error: NextResponse.json({ error: 'invalid_target' }, { status: 400 }) } as const;
  }

  return {
    file: upload.file,
    buffer: upload.buffer,
    target,
    alt: parseAlt(upload.formData.get('alt')),
  } as const;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardAdminApiMutation(request, RATE_LIMITS.uploadAdImage);
  if ('response' in auth) return auth.response;

  const { id } = await params;

  const row = await loadCreativeImages(id);
  if (row instanceof NextResponse) return row;

  const fileResult = await parseAndValidateFile(request);
  if ('error' in fileResult) return fileResult.error;
  const { file, buffer, target, alt } = fileResult;

  const refused = refuseTargetForKind(row, target);
  if (refused) return refused;

  const maxEdge = MAX_LONG_EDGE[target];
  let processed: Buffer;
  try {
    processed = await sharp(Buffer.from(buffer), SHARP_DECODE_OPTIONS)
      .rotate()
      .resize(maxEdge, maxEdge, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: 'invalid_file_type' }, { status: 400 });
  }

  const ext = MIME_TO_EXTENSION[file.type];
  const timestamp = Date.now();
  const storagePath = `${id}/${timestamp}.${ext}`;

  const supabase = createAdminClient();
  const { error: uploadError } = await supabase.storage
    .from(AD_CREATIVES_BUCKET)
    .upload(storagePath, processed, { contentType: file.type, upsert: false });
  if (uploadError) {
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(AD_CREATIVES_BUCKET).getPublicUrl(storagePath);

  // The previous image this upload replaces, for cleanup after the row flips.
  const previousPath = storagePathFromPublicUrl(currentImageUrl(row, target));

  const persistence = await persistWithUploadRollback({
    persist: () =>
      db
        .update(adCreatives)
        .set({ ...targetImageColumns(row, target, urlData.publicUrl, alt), updatedAt: new Date() })
        .where(eq(adCreatives.id, id)),
    rollback: () => supabase.storage.from(AD_CREATIVES_BUCKET).remove([storagePath]),
  });
  if (!persistence.ok) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }

  revalidateAdCreatives();

  // Best-effort: drop the previous image now that the row points at the new one.
  if (previousPath && previousPath !== storagePath) {
    const { error } = await supabase.storage.from(AD_CREATIVES_BUCKET).remove([previousPath]);
    if (error) {
      console.warn('ad-creatives: failed to remove replaced image', previousPath, error);
    }
  }

  return NextResponse.json({ imagePath: urlData.publicUrl }, { status: 200 });
}

/**
 * Remove an uploaded image. For `thumbnail` the board `fen` is kept (the card
 * falls back to it); for `avatar` the path is nulled. Best-effort deletes the
 * storage object too, so removal doesn't orphan files.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardAdminApiMutation(request);
  if ('response' in auth) return auth.response;

  const { id } = await params;
  const target = parseTarget(new URL(request.url).searchParams.get('target'));
  if (!target) {
    return NextResponse.json({ error: 'invalid_target' }, { status: 400 });
  }

  const row = await loadCreativeImages(id);
  if (row instanceof NextResponse) return row;
  const refused = refuseTargetForKind(row, target);
  if (refused) return refused;

  const removedUrl = currentImageUrl(row, target);

  await db
    .update(adCreatives)
    .set({ ...targetImageColumns(row, target, null, null), updatedAt: new Date() })
    .where(eq(adCreatives.id, id));

  revalidateAdCreatives();

  const removedPath = storagePathFromPublicUrl(removedUrl);
  if (removedPath) {
    const supabase = createAdminClient();
    const { error } = await supabase.storage.from(AD_CREATIVES_BUCKET).remove([removedPath]);
    if (error) {
      console.warn('ad-creatives: failed to remove image on delete', removedPath, error);
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
