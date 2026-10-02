import { NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';

import { processAndUploadAdminImage } from '@/lib/admin-images/process-and-upload';
import { parseAdminImageUpload } from '@/lib/admin-images/validation';
import { guardAdminApiMutation, parseJsonBody } from '@/lib/api-mutation-guard';
import { articleImages, articles, db } from '@/lib/db';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { persistWithUploadRollback } from '@/lib/supabase/persist-with-upload-rollback';

import { ARTICLE_IMAGES_BUCKET } from './image-validation';

/**
 * Long-edge cap (pixels) applied to raster article images at upload time.
 * Mirrors POST_IMAGE_MAX_LONG_EDGE: 1600 covers retina (2× DPR) of the
 * widest article content slot (~800 px). Resizing here means each viewer
 * downloads bounded bytes from Storage and Vercel Image Optimization
 * generates variants from a smaller source — both contribute to the
 * Image Optimization Transformation cost story.
 */
const ARTICLE_IMAGE_MAX_LONG_EDGE = 1600;

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

/** The shared admin-image gate, plus this endpoint's own `altText` field. */
async function parseAndValidateFile(request: Request) {
  const upload = await parseAdminImageUpload(request);
  if (upload.error) return { error: upload.error } as const;

  const altText = (upload.formData.get('altText') as string) || null;

  return { file: upload.file, buffer: upload.buffer, altText } as const;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardAdminApiMutation(request, RATE_LIMITS.uploadArticleImage);
  if ('response' in auth) return auth.response;

  const { id: articleId } = await params;

  const articleError = await verifyArticleExists(articleId);
  if (articleError) return articleError;

  const fileResult = await parseAndValidateFile(request);
  if ('error' in fileResult) return fileResult.error;

  const { file, buffer, altText } = fileResult;

  const supabase = createAdminClient();
  const uploaded = await processAndUploadAdminImage({
    supabase,
    bucket: ARTICLE_IMAGES_BUCKET,
    ownerId: articleId,
    file,
    buffer,
    maxLongEdge: ARTICLE_IMAGE_MAX_LONG_EDGE,
  });
  if (!uploaded.ok) return uploaded.response;
  const { storagePath, publicUrl, byteLength } = uploaded;

  const persistence = await persistWithUploadRollback({
    persist: async () => {
      const [inserted] = await db
        .insert(articleImages)
        .values({
          articleId,
          storagePath,
          publicUrl,
          altText,
          contentType: file.type,
          // The post-Sharp byte length, so the row reflects what is actually
          // in Storage.
          fileSize: byteLength,
        })
        .returning();
      return inserted;
    },
    rollback: () => supabase.storage.from(ARTICLE_IMAGES_BUCKET).remove([storagePath]),
  });
  if (!persistence.ok) {
    console.warn(
      'article-images: DB insert failed, cleaned up storage file',
      storagePath,
      persistence.error
    );
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  return NextResponse.json(persistence.value, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await guardAdminApiMutation(request);
  if ('response' in auth) return auth.response;

  const { id: articleId } = await params;

  const parseResult = await parseJsonBody<{ imageId?: string }>(request, 'invalid_body');
  if ('response' in parseResult) {
    return parseResult.response;
  }
  const { body } = parseResult;

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
