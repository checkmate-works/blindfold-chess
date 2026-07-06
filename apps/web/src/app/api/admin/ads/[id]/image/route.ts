import { NextResponse } from 'next/server';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { AD_CREATIVES_BUCKET, storagePathFromPublicUrl } from '@/app/admin/ads/_lib/storage';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';

import { isNativeCardPayload } from '@/lib/ads/payload';
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
 * Long-edge cap for the native-card avatar. It renders at 32px (2× DPR = 64),
 * but we allow a little headroom for any future larger placement.
 */
const AVATAR_MAX_LONG_EDGE = 256;

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

  return { file, buffer } as const;
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
  const { file, buffer } = fileResult;

  let processed: Buffer;
  try {
    processed = await sharp(Buffer.from(buffer), { failOn: 'error', pages: 1 })
      .rotate()
      .resize(AVATAR_MAX_LONG_EDGE, AVATAR_MAX_LONG_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
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
  const previousPath = storagePathFromPublicUrl(row.payload.avatarImagePath ?? '');

  try {
    await db
      .update(adCreatives)
      .set({
        payload: { ...row.payload, avatarImagePath: urlData.publicUrl },
        updatedAt: new Date(),
      })
      .where(eq(adCreatives.id, id));
  } catch {
    // DB update failed after upload — remove the just-uploaded orphan file.
    await supabase.storage.from(AD_CREATIVES_BUCKET).remove([storagePath]);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }

  // Best-effort: drop the previous avatar now that the row points at the new one.
  if (previousPath && previousPath !== storagePath) {
    const { error } = await supabase.storage.from(AD_CREATIVES_BUCKET).remove([previousPath]);
    if (error) {
      console.warn('ad-creatives: failed to remove replaced avatar', previousPath, error);
    }
  }

  return NextResponse.json({ avatarImagePath: urlData.publicUrl }, { status: 200 });
}
