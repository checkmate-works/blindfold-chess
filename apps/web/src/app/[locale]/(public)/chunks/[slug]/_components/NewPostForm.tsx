'use client';

import { useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button, FormErrorBanner, Textarea } from '@/app/_components';

import { MAX_CONTENT_LENGTH } from '@/lib/validations/content';

import { AttachmentInput } from '@/app/[locale]/(public)/topics/_components/AttachmentInput';
import type { AttachmentInputMode } from '@/app/[locale]/(public)/topics/_components/AttachmentInput';
import { MediaAttachmentInput } from '@/app/[locale]/(public)/topics/_components/MediaAttachmentInput';
import type { MediaAttachmentMode } from '@/app/[locale]/(public)/topics/_components/MediaAttachmentInput';

import { createChunkPostForImageAttach } from '../_actions/createChunkPostForImageAttach';
import { createChunkPostWithAttachment } from '../_actions/createChunkPostWithAttachment';
import { createChunkPostWithEmbedAttachment } from '../_actions/createChunkPostWithEmbedAttachment';
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
 * family. Both families are now wired in. Game family lives in
 * `<AttachmentInput>` (textarea + auto-detect: PGN, chesscom_embed,
 * lichess_embed). Media family lives in `<MediaAttachmentInput>` (image /
 * FEN / video). Submit routes to the matching atomic Server Action (or,
 * for image, the 2-step inline flow per D1 case B). When both expanders
 * are non-empty the form blocks submit with an inline warning so a single
 * post never carries attachments from more than one family.
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
  const [gameMode, setGameMode] = useState<AttachmentInputMode>({ kind: 'empty' });
  const [imagePhase, setImagePhase] = useState<ImagePhase>('compose');
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);

  const onModeChange = useCallback((mode: MediaAttachmentMode) => {
    setMediaMode(mode);
  }, []);

  const onGameModeChange = useCallback((mode: AttachmentInputMode) => {
    setGameMode(mode);
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

      // Game family — embed (chesscom / lichess). The hidden
      // `embedProvider` / `embedSourceUrl` fields are emitted by
      // `<AttachmentInput>` when its detected mode is `embed`.
      if (gameMode.kind === 'embed') {
        const result = await createChunkPostWithEmbedAttachment(locale, slug, {}, formData);
        if (result?.error) {
          setError(result.error);
          setSubmitting(false);
        }
        return;
      }

      // Game family — PGN (or no attachment): both fall through to
      // `createChunkPostWithAttachment`, which inspects the `attachment`
      // textarea field to decide whether a PGN row is created.
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

  const bothFamiliesActive = gameMode.kind !== 'empty' && mediaMode.kind !== 'empty';

  const submitDisabled =
    submitting ||
    (mediaMode.kind === 'fen' && !mediaMode.valid) ||
    imagePhase === 'attaching' ||
    bothFamiliesActive;

  return (
    <form action={submit} className="space-y-4">
      <FormErrorBanner message={error} />

      <AttachmentInput onModeChange={onGameModeChange} />

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

      {bothFamiliesActive && (
        <p className="text-xs text-destructive" role="alert">
          {/* TODO(i18n): attachment.error.singleKindConstraint (D3 case iii) */}
          Please choose only one attachment type — Game or Media.
        </p>
      )}

      {imagePhase === 'error' && createdPostId !== null && (
        <p className="text-xs text-muted-foreground">
          {/* TODO(i18n): attachment.image.error.partialUploadHint */}
          The comment was posted but image upload failed. The post is visible without images.
        </p>
      )}
    </form>
  );
}
