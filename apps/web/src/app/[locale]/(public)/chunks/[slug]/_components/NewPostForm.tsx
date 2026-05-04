'use client';

import { useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button, FormErrorBanner, Textarea } from '@/app/_components';

import { MAX_CONTENT_LENGTH } from '@/lib/validations/content';

import { MediaAttachmentInput } from '@/app/[locale]/(public)/topics/_components/MediaAttachmentInput';
import type { MediaAttachmentMode } from '@/app/[locale]/(public)/topics/_components/MediaAttachmentInput';

import { createChunkPostForImageAttach } from '../_actions/createChunkPostForImageAttach';
import { createChunkPostWithAttachment } from '../_actions/createChunkPostWithAttachment';
import { createChunkPostWithFenAttachment } from '../_actions/createChunkPostWithFenAttachment';
import { createChunkPostWithVideoAttachment } from '../_actions/createChunkPostWithVideoAttachment';

type Props = {
  locale: string;
  slug: string;
};

/**
 * @design Single-kind constraint
 *
 * SPEC2 D3 case (iii): a post may carry attachments from at most one
 * family. The Game family lives in `<AttachmentInput>` (a textarea with
 * auto-detect — kept hidden in this issue's MVP scope, the chunks new-post
 * form has historically only exposed Media). The Media family is the
 * `<MediaAttachmentInput>` expander below; submitting with an image / FEN /
 * video selection routes to the matching atomic Server Action (or, for
 * image, the 2-step inline flow per D1 case B).
 *
 * Today only the Media family is wired into this form; the Game family
 * surface is added in the same shape as `BasePostForm` once chunks
 * comments need PGN attachments.
 *
 * @design Phase machine for image upload (D1 case B)
 *
 *   compose  — user fills text + selects file(s); submit creates the post
 *   attaching — post id is in hand; each File is POSTed to
 *               `/api/posts/[id]/images` sequentially
 *   done     — `router.push` to the chunk page
 *   error    — image upload failed; the post itself is persisted (this
 *              is acceptable per Lessons §5 — the reaper handles the
 *              orphan-row case in normal operation; here we keep the
 *              post but surface the upload failure so the user can
 *              retry the image flow if desired)
 */
type ImagePhase = 'compose' | 'attaching' | 'done' | 'error';

export function NewPostForm({ locale, slug }: Props) {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaMode, setMediaMode] = useState<MediaAttachmentMode>({ kind: 'empty' });
  const [imagePhase, setImagePhase] = useState<ImagePhase>('compose');
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);

  const onModeChange = useCallback((mode: MediaAttachmentMode) => {
    setMediaMode(mode);
  }, []);

  const submit = async (formData: FormData) => {
    setError(null);
    setSubmitting(true);

    try {
      // FEN: atomic single-call action.
      if (mediaMode.kind === 'fen') {
        if (!mediaMode.valid) {
          setError('postFenAttachment.error.invalidFenStructure');
          setSubmitting(false);
          return;
        }
        // Ensure the canonical (trimmed) FEN reaches the action even if
        // the textarea retained whitespace.
        formData.set('attachmentFen', mediaMode.fen);
        if (mediaMode.caption !== null) {
          formData.set('attachmentFenCaption', mediaMode.caption);
        }
        const result = await createChunkPostWithFenAttachment(locale, slug, {}, formData);
        // The action redirects on success; if we got here the only paths
        // are an early validation error or an exception — the latter is
        // already caught below.
        if (result?.error) {
          setError(result.error);
          setSubmitting(false);
        }
        return;
      }

      // Video: atomic single-call action.
      if (mediaMode.kind === 'video') {
        formData.set('attachmentVideoUrl', mediaMode.url);
        const result = await createChunkPostWithVideoAttachment(locale, slug, {}, formData);
        if (result?.error) {
          setError(result.error);
          setSubmitting(false);
        }
        return;
      }

      // Image: 2-step (post create -> per-file upload). The post is
      // persisted before any image upload happens; if uploads fail the
      // post stays as a text-only comment (graceful degradation, see
      // Lessons §5 / SPEC2 D1 case B rationale).
      if (mediaMode.kind === 'image') {
        const createResult = await createChunkPostForImageAttach(locale, slug, formData);
        if (!createResult.ok) {
          setError(createResult.error);
          setSubmitting(false);
          return;
        }
        setCreatedPostId(createResult.postId);
        setImagePhase('attaching');
        try {
          for (const file of mediaMode.files) {
            const fd = new FormData();
            fd.set('file', file);
            const res = await fetch(`/api/posts/${createResult.postId}/images`, {
              method: 'POST',
              body: fd,
              credentials: 'same-origin',
            });
            if (!res.ok) {
              const body = (await res.json().catch(() => ({}))) as { error?: string };
              setError(body.error ?? 'attachment.image.error.uploadFailed');
              setImagePhase('error');
              setSubmitting(false);
              return;
            }
          }
          setImagePhase('done');
          router.push(`/${locale}/chunks/${slug}#post-${createResult.postId}`);
          router.refresh();
          return;
        } catch {
          setError('attachment.image.error.uploadFailed');
          setImagePhase('error');
          setSubmitting(false);
          return;
        }
      }

      // No attachment: plain comment.
      const result = await createChunkPostWithAttachment(locale, slug, {}, formData);
      if (result?.error) {
        setError(result.error);
        setSubmitting(false);
      }
    } catch (err) {
      // next/navigation's `redirect()` throws an internal error to abort
      // rendering. Re-throw so Next.js can pick it up; everything else is
      // a real failure.
      if (err instanceof Error && err.message === 'NEXT_REDIRECT') {
        throw err;
      }
      setError('error');
      setSubmitting(false);
    }
  };

  const submitDisabled =
    submitting || (mediaMode.kind === 'fen' && !mediaMode.valid) || imagePhase === 'attaching';

  return (
    <form action={submit} className="space-y-4">
      <FormErrorBanner message={error} />

      <MediaAttachmentInput onModeChange={onModeChange} />

      <div className="space-y-2">
        <label htmlFor="content" className="sr-only">
          {/* TODO(i18n): topics.chunks.newPostForm.contentLabel (existing key) */}
          Comment
        </label>
        <Textarea
          id="content"
          name="content"
          rows={6}
          maxLength={MAX_CONTENT_LENGTH}
          placeholder=""
          required
        />
      </div>

      <input type="hidden" name="replyPermission" value="everyone" />

      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={submitDisabled}
        loading={submitting}
      >
        {/* TODO(i18n): topics.chunks.newPostForm.submit (existing key) */}
        {imagePhase === 'attaching' ? 'Uploading images…' : submitting ? 'Submitting…' : 'Submit'}
      </Button>

      {imagePhase === 'error' && createdPostId !== null && (
        <p className="text-xs text-muted-foreground">
          {/* TODO(i18n): attachment.image.error.partialUploadHint */}
          The comment was posted but image upload failed. The post is visible without images.
        </p>
      )}
    </form>
  );
}
