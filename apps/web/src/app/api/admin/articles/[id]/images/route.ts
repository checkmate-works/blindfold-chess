import { NextResponse } from 'next/server';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';

import { MIME_TO_EXTENSION, parseAdminImageUpload } from '@/lib/admin-images/validation';
import { checkMutationOrigin, parseJsonBody } from '@/lib/api-mutation-guard';
import { articleImages, articles, db } from '@/lib/db';
import { SHARP_DECODE_OPTIONS } from '@/lib/images/sharp-options';
import { RATE_LIMITS, checkRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';

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

/**
 * Decompression-bomb ceiling (input pixels) for the Sharp decode. Matches the
 * post-image policy (50 MP): rejects a highly compressible huge-dimension
 * image that sits under the 5 MB byte cap but would decode to ~GBs of memory.
 */

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

/** The shared admin-image gate, plus this endpoint's own `altText` field. */
async function parseAndValidateFile(request: Request) {
  const upload = await parseAdminImageUpload(request);
  if (upload.error) return { error: upload.error } as const;

  const altText = (upload.formData.get('altText') as string) || null;

  return { file: upload.file, buffer: upload.buffer, altText } as const;
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

  const { id: articleId } = await params;

  const articleError = await verifyArticleExists(articleId);
  if (articleError) return articleError;

  const fileResult = await parseAndValidateFile(request);
  if ('error' in fileResult) return fileResult.error;

  const { file, buffer, altText } = fileResult;

  // Every accepted image is a raster (jpeg/png/webp — SVG is rejected by the
  // MIME allow-list and magic-byte check in parseAndValidateFile, so it never
  // reaches here). Run it through Sharp: rotate (bake in EXIF orientation,
  // strip metadata) → cap long edge to ARTICLE_IMAGE_MAX_LONG_EDGE →
  // re-encode in the source format. `limitInputPixels` rejects a
  // decompression bomb before the full decode.
  let payload: Buffer | ArrayBuffer = buffer;
  let payloadByteLength = file.size;
  try {
    const processed = await sharp(Buffer.from(buffer), SHARP_DECODE_OPTIONS)
      .rotate()
      .resize(ARTICLE_IMAGE_MAX_LONG_EDGE, ARTICLE_IMAGE_MAX_LONG_EDGE, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();
    payload = processed;
    payloadByteLength = processed.byteLength;
  } catch {
    return NextResponse.json({ error: 'invalid_file_type' }, { status: 400 });
  }

  const ext = MIME_TO_EXTENSION[file.type];
  const timestamp = Date.now();
  const storagePath = `${articleId}/${timestamp}.${ext}`;

  const supabase = createAdminClient();

  const { error: uploadError } = await supabase.storage
    .from(ARTICLE_IMAGES_BUCKET)
    .upload(storagePath, payload, {
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
        // Use the post-Sharp byte length so the row reflects what's
        // actually in Storage; SVG falls through with its original size.
        fileSize: payloadByteLength,
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
  const originError = checkMutationOrigin(request);
  if (originError) return originError;

  const auth = await authenticateAdmin();
  if (auth instanceof NextResponse) return auth;

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
