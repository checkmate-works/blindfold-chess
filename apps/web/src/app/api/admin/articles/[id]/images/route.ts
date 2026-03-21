import { NextResponse } from 'next/server';

import { requireAdmin } from '@/app/admin/_lib/auth';
import { eq } from 'drizzle-orm';

import { articleImages, articles, db } from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

/**
 * Validate file binary signature matches the declared MIME type.
 * Returns true if the binary content matches one of the allowed types.
 */
export function validateBinarySignature(buffer: ArrayBuffer, declaredType: string): boolean {
  const header = new Uint8Array(buffer.slice(0, 12));

  if (declaredType === 'image/jpeg') {
    return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }
  if (declaredType === 'image/png') {
    return header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  }
  if (declaredType === 'image/webp') {
    return header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
  }
  if (declaredType === 'image/svg+xml') {
    // SVG files can contain embedded scripts (XSS vector). Currently this is
    // acceptable because: (1) only admins can upload, and (2) Supabase Storage
    // serves files from a separate domain, isolating cookies/JS context.
    // If uploads are ever opened to non-admin users, SVG sanitization
    // (e.g. DOMPurify) must be added before allowing SVG uploads.
    const text = new TextDecoder().decode(new Uint8Array(buffer.slice(0, 256)));
    return text.trimStart().startsWith('<') && (text.includes('<svg') || text.includes('<?xml'));
  }

  return false;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id: articleId } = await params;

  // Verify article exists
  const [article] = await db
    .select({ id: articles.id })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!article) {
    return NextResponse.json({ error: 'article_not_found' }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form_data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file_required' }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'invalid_file_type' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();

  if (!validateBinarySignature(buffer, file.type)) {
    return NextResponse.json({ error: 'invalid_file_type' }, { status: 400 });
  }

  const ext = EXTENSION_MAP[file.type];
  const timestamp = Date.now();
  const storagePath = `${articleId}/${timestamp}.${ext}`;

  const supabase = createAdminClient();

  const { error: uploadError } = await supabase.storage
    .from('article-images')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('article-images').getPublicUrl(storagePath);

  const altText = (formData.get('altText') as string) || null;

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
    await supabase.storage.from('article-images').remove([storagePath]);
    console.warn('article-images: DB insert failed, cleaned up storage file', storagePath, err);
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  return NextResponse.json(inserted, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

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
    .from('article-images')
    .remove([image.storagePath]);

  if (storageError) {
    console.warn('article-images: orphan file left in storage', image.storagePath, storageError);
  }

  return NextResponse.json({ success: true });
}
