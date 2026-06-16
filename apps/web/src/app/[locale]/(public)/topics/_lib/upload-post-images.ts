/**
 * Client helper for the 2-step image-attachment flow.
 *
 * Once a post (or reply) exists, each selected image is POSTed
 * sequentially to `/api/posts/[id]/images` (multipart `file` field).
 * Sequential — not parallel — so the per-post 3-image cap enforced by
 * the BEFORE INSERT trigger is hit deterministically and a partial
 * failure leaves a predictable prefix of images attached.
 *
 * Returns the first failure (if any). The post itself is already
 * persisted by the time this runs, so a failure degrades gracefully to
 * a text-only comment plus whatever images uploaded before the error —
 * the caller surfaces the error key but does not roll back the post.
 */
export type UploadPostImagesResult = { ok: true } | { ok: false; error: string };

export async function uploadPostImages(
  postId: string,
  files: readonly File[]
): Promise<UploadPostImagesResult> {
  for (const file of files) {
    const fd = new FormData();
    fd.set('file', file);
    let res: Response;
    try {
      res = await fetch(`/api/posts/${postId}/images`, {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
      });
    } catch {
      return { ok: false, error: 'attachment.image.error.uploadFailed' };
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: body.error ?? 'attachment.image.error.uploadFailed' };
    }
  }
  return { ok: true };
}
