import { NextResponse } from 'next/server';

import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import 'server-only';

import { authenticateAndGuardApi } from '@/lib/auth';
import { db, postImageAttachments, topicPosts } from '@/lib/db';
import {
  isWithinMegapixelCap,
  probeImageDimensions,
  stripExifAndApplyOrientation,
} from '@/lib/post-images/sharp-helpers';
import {
  POST_IMAGES_ALLOWED_MIME_TYPES,
  POST_IMAGES_BUCKET,
  POST_IMAGES_MAX_FILE_SIZE,
  buildPostImageStoragePath,
  isAllowedPostImageMimeType,
  validatePostImageBinarySignature,
} from '@/lib/post-images/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';

/**
 * POST /api/posts/[id]/images
 *
 * Uploads a single image attachment for a topic post. The handler is the
 * authoritative path for image uploads — direct REST writes against
 * `post_image_attachments` are blocked by the table's RLS policy.
 *
 * Defenses, in order:
 *   1. Auth + rate limit (`authenticateAndGuardApi`).
 *   2. Pre-parse `Content-Length` ceiling — refuses large bodies before
 *      `formData()` materializes them in memory.
 *   3. Parent post lookup: must exist, must be owned by the caller, must
 *      not be soft-deleted.
 *   4. MIME allow-list (POST_IMAGES_ALLOWED_MIME_TYPES — narrower than the
 *      admin article path, no SVG).
 *   5. Per-file size cap (2 MB).
 *   6. Magic-byte signature check (catches MIME spoofing).
 *   7. Sharp dimension probe + 50 MP cap.
 *   8. Sharp EXIF strip + orientation bake-in (re-encodes the buffer).
 *   9. Storage upload via the user-session client (RLS still applies).
 *  10. DB INSERT — the BEFORE INSERT trigger consults the per-post counter
 *      under FOR UPDATE and rejects the 4th image.
 *  11. On DB failure, the **admin** client removes the orphan storage
 *      object (the only admin-client use in this handler).
 *
 * The DB CHECK on `storage_path` (regex pin) and the
 * `post_image_attachments_chk_*` CHECKs are the last line of defense.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await authenticateAndGuardApi(RATE_LIMITS.uploadPostImage);
  if ('response' in guard) return guard.response;
  const { user } = guard;

  // Pre-parse Content-Length ceiling — reject before formData() reads.
  const contentLength = request.headers.get('content-length');
  if (contentLength !== null) {
    const lengthNumber = Number.parseInt(contentLength, 10);
    if (Number.isFinite(lengthNumber) && lengthNumber > POST_IMAGES_MAX_FILE_SIZE * 2) {
      // Multipart envelope adds ~few KB of overhead to the raw file size.
      // Doubling the cap as the request-level ceiling leaves comfortable
      // headroom while still blocking obviously oversized uploads from
      // ever being parsed.
      return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
    }
  }

  const { id: postId } = await params;

  // Parent-post existence + ownership + not soft-deleted.
  const [post] = await db
    .select({
      id: topicPosts.id,
      userId: topicPosts.userId,
      deletedAt: topicPosts.deletedAt,
    })
    .from(topicPosts)
    .where(eq(topicPosts.id, postId))
    .limit(1);

  if (!post) {
    return NextResponse.json({ error: 'post_not_found' }, { status: 404 });
  }
  if (post.userId !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (post.deletedAt) {
    return NextResponse.json({ error: 'post_deleted' }, { status: 410 });
  }

  // FormData parse is bounded by the Content-Length ceiling above.
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

  if (!isAllowedPostImageMimeType(file.type)) {
    return NextResponse.json(
      {
        error: 'invalid_file_type',
        accepted: POST_IMAGES_ALLOWED_MIME_TYPES,
      },
      { status: 400 }
    );
  }

  if (file.size <= 0 || file.size > POST_IMAGES_MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'file_too_large' }, { status: 413 });
  }

  const arrayBuffer = await file.arrayBuffer();

  if (!validatePostImageBinarySignature(arrayBuffer, file.type)) {
    return NextResponse.json({ error: 'invalid_file_type' }, { status: 400 });
  }

  // Sharp probe (dimensions + 50 MP cap).
  let probe;
  try {
    probe = await probeImageDimensions(arrayBuffer);
  } catch {
    return NextResponse.json({ error: 'invalid_image' }, { status: 400 });
  }
  if (!isWithinMegapixelCap(probe)) {
    return NextResponse.json({ error: 'image_too_large' }, { status: 400 });
  }

  // EXIF strip + orientation bake-in. The persisted bytes must carry no GPS.
  let processedBuffer: Buffer;
  try {
    processedBuffer = await stripExifAndApplyOrientation({
      buffer: arrayBuffer,
      contentType: file.type,
    });
  } catch {
    return NextResponse.json({ error: 'image_processing_failed' }, { status: 500 });
  }

  // Re-probe the processed buffer in case the rotation changed the
  // recorded dimensions (portrait orientation flipped). Falls back to
  // the original probe if re-probe fails.
  const finalDimensions = await probeImageDimensions(processedBuffer).catch(() => probe);
  if (!isWithinMegapixelCap(finalDimensions)) {
    return NextResponse.json({ error: 'image_too_large' }, { status: 400 });
  }

  const altText =
    typeof formData.get('altText') === 'string'
      ? (formData.get('altText') as string).slice(0, 255) || null
      : null;

  const storagePath = buildPostImageStoragePath({
    userId: user.id,
    postId,
    randomUuid: randomUUID(),
    contentType: file.type,
  });

  // User-session client — RLS still applies (the bucket policy enforces
  // that the storage_path's first folder is the calling user's id).
  const sessionSupabase = await createServerClient();
  const { error: uploadError } = await sessionSupabase.storage
    .from(POST_IMAGES_BUCKET)
    .upload(storagePath, processedBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: 'upload_failed' }, { status: 500 });
  }

  let inserted;
  try {
    [inserted] = await db
      .insert(postImageAttachments)
      .values({
        postId,
        storagePath,
        contentType: file.type,
        fileSize: processedBuffer.byteLength,
        width: finalDimensions.width,
        height: finalDimensions.height,
        altText,
      })
      .returning();
  } catch (err) {
    // DB rejected the insert — could be the per-post cap trigger
    // ('post_image_count_exceeded'), a CHECK violation, or anything else.
    // Roll back the orphan storage object via the admin client (the only
    // admin-client use in this handler).
    const admin = createAdminClient();
    await admin.storage.from(POST_IMAGES_BUCKET).remove([storagePath]);

    const message = err instanceof Error ? err.message : '';
    if (message.includes('post_image_count_exceeded')) {
      return NextResponse.json({ error: 'too_many_images' }, { status: 409 });
    }
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 });
  }

  const { data: urlData } = sessionSupabase.storage
    .from(POST_IMAGES_BUCKET)
    .getPublicUrl(storagePath);

  // Explicit response shape: do NOT spread `inserted` directly. Spreading
  // would leak every column from `post_image_attachments` (including any
  // future internal columns like soft-delete flags or moderation hints)
  // into a public API contract by accident. The fields below are the
  // subset clients actually need.
  //
  // `storagePath` is intentionally OMITTED — the client only needs
  // `publicUrl` (already derived from the path), and exposing the raw
  // storage path leaks the path-construction scheme to anyone with a
  // valid auth session. The path layout is already pinned by RLS and a
  // DB CHECK, but minimizing exposure keeps the bar high.
  return NextResponse.json(
    {
      id: inserted.id,
      postId: inserted.postId,
      contentType: inserted.contentType,
      fileSize: inserted.fileSize,
      width: inserted.width,
      height: inserted.height,
      altText: inserted.altText,
      displayOrder: inserted.displayOrder,
      createdAt: inserted.createdAt,
      publicUrl: urlData.publicUrl,
    },
    { status: 201 }
  );
}
