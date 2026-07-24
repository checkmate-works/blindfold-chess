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
 *
 * Failures are reported to Sentry with the HTTP status, the server's raw
 * error code, and the file's metadata (type / size — never the bytes), so a
 * production "could not attach" can be diagnosed to its exact cause (wrong
 * format reaching the server, oversized file, network error, …) without
 * relying on the user relaying an on-screen message.
 */
import * as Sentry from '@sentry/nextjs';

export type UploadPostImagesResult = { ok: true } | { ok: false; error: string };

export async function uploadPostImages(
  postId: string,
  files: readonly File[]
): Promise<UploadPostImagesResult> {
  for (const file of files) {
    const fileMeta = { name: file.name, type: file.type, size: file.size };
    const fd = new FormData();
    fd.set('file', file);
    let res: Response;
    try {
      res = await fetch(`/api/posts/${postId}/images`, {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
      });
    } catch (err) {
      Sentry.captureException(err, {
        tags: { feature: 'post-image-upload', phase: 'network' },
        extra: { postId, file: fileMeta },
      });
      return { ok: false, error: 'attachment.image.error.uploadFailed' };
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      Sentry.captureMessage('post-image-upload-rejected', {
        level: 'error',
        tags: { feature: 'post-image-upload', phase: 'server', status: String(res.status) },
        extra: { postId, status: res.status, serverError: body.error ?? null, file: fileMeta },
      });
      return { ok: false, error: body.error ?? 'attachment.image.error.uploadFailed' };
    }
  }
  return { ok: true };
}
