import { NextResponse } from 'next/server';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { eq } from 'drizzle-orm';

import { articleImages, articles, db } from '@/lib/db';
import { RATE_LIMITS, checkRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';

import {
  ALLOWED_MIME_TYPES,
  ARTICLE_IMAGES_BUCKET,
  MAX_FILE_SIZE,
  MIME_TO_EXTENSION,
  validateBinarySignature,
} from './image-validation';

async function authenticateAdmin(): Promise<NextResponse | { userId: string }> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return auth;
}

async function verifyArticleExists(articleId: string): Promise<NextResponse | null> {
  const [article] = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article) {
    return NextResponse.json({ error: 'article_not_found' }, { status: 404 });
  }
  return null;
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

  const altText = (formData.get('altText') as string) || null;

  return { file, buffer, altText } as const;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAdmin();
  if (auth instanceof NextResponse) return auth;

  const rateLimitResult = await checkRateLimit(auth.userId, RATE_LIMITS.uploadArticleImage);
  if ('error' in rateLimitResult) {
    return NextResponse.json({ error: 'rateLimited' }, { status: 429 });
  }

  const { id: articleId } = await params;

  const articleError = await verifyArticleExists(articleId);
  if (articleError) return articleError;

  const fileResult = await parseAndValidateFile(request);
  if ('error' in fileResult) return fileResult.error;

  const { file, buffer, altText } = fileResult;

  const ext = MIME_TO_EXTENSION[file.type];
  const timestamp = Date.now();
  const storagePath = `${articleId}/${timestamp}.${ext}`;

  const supabase = createAdminClient();

  const { error: uploadError } = await supabase.storage
    .from(ARTICLE_IMAGES_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(ARTICLE_IMAGES_BUCKET).getPublicUrl(storagePath);

  let inserted;
  try {
    [inserted] = await db
      .insert(articleImages)
      .values({
        articleId,
        storagePath,
        publicUrl: urlData.publicUrl,
        altText,
        contentType: file.type,
        fileSize: file.size,
      })
      .returning();
  } catch (err) {
    // DB insert failed after Storage upload succeeded — clean up the orphan file
    await supabase.storage.from(ARTICLE_IMAGES_BUCKET).remove([storagePath]);
    console.warn('article-images: DB insert failed, cleaned up storage file', storagePath, err);
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  return NextResponse.json(inserted, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id: articleId } = await params;

  let body: { imageId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (!body.imageId) {
    return NextResponse.json({ error: 'image_id_required' }, { status: 400 });
  }

  // Fetch the image record to get storagePath and verify it belongs to this article
  const [image] = await db
    .select()
    .from(articleImages)
    .where(eq(articleImages.id, body.imageId))
    .limit(1);

  if (!image || image.articleId !== articleId) {
    return NextResponse.json({ error: 'image_not_found' }, { status: 404 });
  }

  // Delete DB record first (authoritative state), then clean up Storage.
  // If Storage deletion fails, the orphan file can be cleaned up later.
  await db.delete(articleImages).where(eq(articleImages.id, body.imageId));

  const supabase = createAdminClient();

  const { error: storageError } = await supabase.storage
    .from(ARTICLE_IMAGES_BUCKET)
    .remove([image.storagePath]);

  if (storageError) {
    console.warn('article-images: orphan file left in storage', image.storagePath, storageError);
  }

  return NextResponse.json({ success: true });
}
