'use client';

import { useCallback, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Button, FormErrorBanner, Textarea } from '@/app/_components';

import { MAX_CONTENT_LENGTH } from '@/lib/validations/content';

import { createChunkPostForImageAttach } from '../_actions/createChunkPostForImageAttach';
import { createChunkPostWithAttachment } from '../_actions/createChunkPostWithAttachment';
import { createChunkPostWithEmbedAttachment } from '../_actions/createChunkPostWithEmbedAttachment';
import { createChunkPostWithFenAttachment } from '../_actions/createChunkPostWithFenAttachment';
import { createChunkPostWithVideoAttachment } from '../_actions/createChunkPostWithVideoAttachment';
import { AttachmentModal } from './AttachmentModal';
import type { AggregatedAttachmentMode } from './AttachmentModal';

type Props = {
  locale: string;
  slug: string;
};

/**
 * @design Single-kind constraint
 *
 * SPEC2 D3 case (iii) is now satisfied structurally rather than through
 * a runtime warning: the AttachmentModal aggregates the active tab's
 * mode into a single discriminated `AggregatedAttachmentMode`, and only
 * that one is forwarded here. The previous `bothFamiliesActive` check
 * is removed because it is impossible to reach.
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
  const [attachment, setAttachment] = useState<AggregatedAttachmentMode>({ kind: 'empty' });
  const [modalOpen, setModalOpen] = useState(false);
  const [imagePhase, setImagePhase] = useState<ImagePhase>('compose');
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);

  const onApply = useCallback((mode: AggregatedAttachmentMode) => {
    setAttachment(mode);
  }, []);

  const submit = async (formData: FormData) => {
    setError(null);
    setSubmitting(true);

    try {
      switch (attachment.kind) {
        case 'fen': {
          if (!attachment.valid) {
            setError('postFenAttachment.error.invalidFenStructure');
            setSubmitting(false);
            return;
          }
          formData.set('attachmentFen', attachment.fen);
          if (attachment.caption !== null) {
            formData.set('attachmentFenCaption', attachment.caption);
          }
          const result = await createChunkPostWithFenAttachment(locale, slug, {}, formData);
          if (result?.error) {
            setError(result.error);
            setSubmitting(false);
          }
          return;
        }
        case 'video': {
          formData.set('attachmentVideoUrl', attachment.url);
          const result = await createChunkPostWithVideoAttachment(locale, slug, {}, formData);
          if (result?.error) {
            setError(result.error);
            setSubmitting(false);
          }
          return;
        }
        case 'image': {
          // 2-step (post create -> per-file upload). The post is
          // persisted before any image upload happens; if uploads fail
          // the post stays as a text-only comment (graceful
          // degradation, see Lessons §5 / SPEC2 D1 case B rationale).
          const createResult = await createChunkPostForImageAttach(locale, slug, formData);
          if (!createResult.ok) {
            setError(createResult.error);
            setSubmitting(false);
            return;
          }
          setCreatedPostId(createResult.postId);
          setImagePhase('attaching');
          try {
            for (const file of attachment.files) {
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
        case 'embed': {
          formData.set('embedProvider', attachment.provider);
          formData.set('embedSourceUrl', attachment.sourceUrl);
          if (attachment.anonymize) {
            formData.set('attachmentAnonymize', 'on');
          }
          const result = await createChunkPostWithEmbedAttachment(locale, slug, {}, formData);
          if (result?.error) {
            setError(result.error);
            setSubmitting(false);
          }
          return;
        }
        case 'pgn': {
          // The AttachmentInput textarea lives inside a portal'd modal
          // so its `attachment` / `attachmentAnonymize` fields are not
          // captured by the parent form's FormData. Synthesize them
          // here from the captured mode.
          formData.set('attachment', attachment.pgn);
          if (attachment.anonymize) {
            formData.set('attachmentAnonymize', 'on');
          }
          const result = await createChunkPostWithAttachment(locale, slug, {}, formData);
          if (result?.error) {
            setError(result.error);
            setSubmitting(false);
          }
          return;
        }
        case 'empty': {
          // No attachment — `createChunkPostWithAttachment` posts a
          // plain comment when its `attachment` field is empty.
          const result = await createChunkPostWithAttachment(locale, slug, {}, formData);
          if (result?.error) {
            setError(result.error);
            setSubmitting(false);
          }
          return;
        }
        default: {
          const _exhaustive: never = attachment;
          return _exhaustive;
        }
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
    submitting || (attachment.kind === 'fen' && !attachment.valid) || imagePhase === 'attaching';

  const attachmentSummary = describeAttachment(attachment);

  return (
    <form action={submit} className="space-y-4">
      <FormErrorBanner message={error} />

      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="text-sm text-link-primary hover:underline"
        >
          {/* TODO(i18n): attachment.modal.openButton */}
          {attachment.kind === 'empty' ? 'Add attachment' : 'Edit attachment'}
        </button>
        {attachmentSummary && <p className="text-xs text-muted-foreground">{attachmentSummary}</p>}
      </div>

      <AttachmentModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onApply={onApply} />

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

function describeAttachment(mode: AggregatedAttachmentMode): string | null {
  switch (mode.kind) {
    case 'empty':
      return null;
    case 'pgn':
      // TODO(i18n): attachment.modal.summary.pgn
      return 'Game (PGN) attached.';
    case 'embed':
      // TODO(i18n): attachment.modal.summary.embed
      return `Game (${mode.provider} embed) attached.`;
    case 'image':
      // TODO(i18n): attachment.modal.summary.image
      return `${mode.files.length} image${mode.files.length === 1 ? '' : 's'} attached.`;
    case 'fen':
      // TODO(i18n): attachment.modal.summary.fen
      return mode.valid ? 'Position (FEN) attached.' : 'Position (FEN) attached (invalid).';
    case 'video':
      // TODO(i18n): attachment.modal.summary.video
      return 'Video attached.';
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}
