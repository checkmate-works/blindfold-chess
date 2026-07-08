import { NextResponse } from 'next/server';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { revalidateAdCreatives } from '@/app/admin/ads/_lib/revalidate';
import { AD_CREATIVES_BUCKET, storagePathFromPublicUrl } from '@/app/admin/ads/_lib/storage';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';

import { DEFAULT_NATIVE_THUMBNAIL_FEN, isNativeCardPayload } from '@/lib/ads/payload';
import { checkMutationOrigin } from '@/lib/api-mutation-guard';
import { adCreatives, db } from '@/lib/db';
import { RATE_LIMITS, checkRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';

import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MIME_TO_EXTENSION,
  validateBinarySignature,
} from './image-validation';

/**
 * Long-edge resize caps per upload target. The avatar renders small (32px, 2×
 * DPR = 64); the thumbnail fills the card's board slot, so it gets more room.
 */
const MAX_LONG_EDGE: Record<ImageTarget, number> = {
  avatar: 256,
  thumbnail: 512,
};

type ImageTarget = 'avatar' | 'thumbnail';

function parseTarget(value: FormDataEntryValue | null): ImageTarget {
  return value === 'thumbnail' ? 'thumbnail' : 'avatar';
}

async function authenticateAdmin(): Promise<NextResponse | { userId: string }> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return auth;
}

async function parseAndValidateFile(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return { error: NextResponse.json({ error: 'invalid_form_data' }, { status: 400 }) } as const;
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { error: NextResponse.json({ error: 'file_required' }, { status: 400 }) } as const;
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { error: NextResponse.json({ error: 'invalid_file_type' }, { status: 400 }) } as const;
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: NextResponse.json({ error: 'file_too_large' }, { status: 400 }) } as const;
  }

  const buffer = await file.arrayBuffer();
  if (!validateBinarySignature(buffer, file.type)) {
    return { error: NextResponse.json({ error: 'invalid_file_type' }, { status: 400 }) } as const;
  }

  const target = parseTarget(formData.get('target'));

  return { file, buffer, target } as const;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const originError = checkMutationOrigin(request);
  if (originError) return originError;

  const auth = await authenticateAdmin();
  if (auth instanceof NextResponse) return auth;

  const rateLimitResult = await checkRateLimit(auth.userId, RATE_LIMITS.uploadArticleImage);
  if ('error' in rateLimitResult) {
    return NextResponse.json({ error: 'rateLimited' }, { status: 429 });
  }

  const { id } = await params;

  const [row] = await db
    .select({ payload: adCreatives.payload })
    .from(adCreatives)
    .where(eq(adCreatives.id, id))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (!isNativeCardPayload(row.payload)) {
    // Only native-card creatives have an avatar. Banner images are managed as
    // plain paths, not uploads.
    return NextResponse.json({ error: 'unsupported_kind' }, { status: 400 });
  }

  const fileResult = await parseAndValidateFile(request);
  if ('error' in fileResult) return fileResult.error;
  const { file, buffer, target } = fileResult;

  const maxEdge = MAX_LONG_EDGE[target];
  let processed: Buffer;
  try {
    processed = await sharp(Buffer.from(buffer), { failOn: 'error', pages: 1 })
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

  // The field this upload replaces, and the previous image it points at (for
  // cleanup), depend on the target. The thumbnail keeps its board `fen`; the
  // uploaded image is an override on top of it.
  const currentThumb = row.payload.thumbnail;
  const previousUrl =
    target === 'thumbnail' ? (currentThumb?.imagePath ?? '') : (row.payload.avatarImagePath ?? '');
  const previousPath = storagePathFromPublicUrl(previousUrl);

  const nextPayload =
    target === 'thumbnail'
      ? {
          ...row.payload,
          thumbnail: {
            fen: currentThumb?.fen ?? DEFAULT_NATIVE_THUMBNAIL_FEN,
            imagePath: urlData.publicUrl,
            imageAlt: currentThumb?.imageAlt ?? '',
          },
        }
      : { ...row.payload, avatarImagePath: urlData.publicUrl };

  try {
    await db
      .update(adCreatives)
      .set({ payload: nextPayload, updatedAt: new Date() })
      .where(eq(adCreatives.id, id));
  } catch {
    // DB update failed after upload — remove the just-uploaded orphan file.
    await supabase.storage.from(AD_CREATIVES_BUCKET).remove([storagePath]);
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
  const originError = checkMutationOrigin(request);
  if (originError) return originError;

  const auth = await authenticateAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const target = parseTarget(new URL(request.url).searchParams.get('target'));

  const [row] = await db
    .select({ payload: adCreatives.payload })
    .from(adCreatives)
    .where(eq(adCreatives.id, id))
    .limit(1);
  if (!row) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!isNativeCardPayload(row.payload)) {
    return NextResponse.json({ error: 'unsupported_kind' }, { status: 400 });
  }

  const currentThumb = row.payload.thumbnail;
  const removedUrl =
    target === 'thumbnail' ? (currentThumb?.imagePath ?? '') : (row.payload.avatarImagePath ?? '');

  const nextPayload =
    target === 'thumbnail'
      ? {
          ...row.payload,
          thumbnail: { fen: currentThumb?.fen ?? DEFAULT_NATIVE_THUMBNAIL_FEN },
        }
      : { ...row.payload, avatarImagePath: null };

  await db
    .update(adCreatives)
    .set({ payload: nextPayload, updatedAt: new Date() })
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
