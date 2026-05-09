'use client';

import { useCallback, useState } from 'react';

import { Button, FormErrorBanner, Textarea } from '@/app/_components';
import { FaPaperclip } from 'react-icons/fa';

import { MAX_CONTENT_LENGTH } from '@/lib/validations/content';

import { createChunkPostWithAttachment } from '../_actions/createChunkPostWithAttachment';
import { createChunkPostWithFenAttachment } from '../_actions/createChunkPostWithFenAttachment';
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
 * @design Pre-release scope (#84)
 *
 * The form only routes PGN / FEN / empty attachments. The image,
 * video, and embed Server Actions plus the 2-step image-upload flow
 * stay in the codebase as dead code and can be re-enabled by reverting
 * the AttachmentModal / AttachmentInput restrictions and restoring
 * the corresponding switch arms here.
 */
export function NewPostForm({ locale, slug }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<AggregatedAttachmentMode>({ kind: 'empty' });
  const [modalOpen, setModalOpen] = useState(false);
  const [contentLength, setContentLength] = useState(0);

  // Counter color logic synced from
  // `apps/web/src/app/_components/Textarea.tsx:39-45`. Inlined here so
  // the counter can render alongside the paperclip icon row instead of
  // the default below-textarea slot.
  const ratio = MAX_CONTENT_LENGTH ? contentLength / MAX_CONTENT_LENGTH : 0;
  const counterColor =
    ratio >= 1
      ? 'text-destructive'
      : ratio >= 0.9
        ? 'text-warning dark:text-yellow-400'
        : 'text-muted-foreground';

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

  const submitDisabled = submitting || (attachment.kind === 'fen' && !attachment.valid);

  const attachmentSummary = describeAttachment(attachment);

  return (
    <form action={submit} className="space-y-4">
      <FormErrorBanner message={error} />

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
          showCount={false}
          onChange={(e) => setContentLength(e.target.value.length)}
        />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center text-link-primary hover:opacity-80"
              // TODO(i18n): attachment.modal.openButton (Add attachment / Edit attachment)
              aria-label={attachment.kind === 'empty' ? 'Add attachment' : 'Edit attachment'}
            >
              <FaPaperclip aria-hidden="true" className="w-4 h-4" />
            </button>
            {attachmentSummary && (
              <p className="text-xs text-muted-foreground">{attachmentSummary}</p>
            )}
          </div>
          <p className={`text-xs ${counterColor}`}>
            {contentLength.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()}
          </p>
        </div>
      </div>

      <AttachmentModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onApply={onApply} />

      <input type="hidden" name="replyPermission" value="everyone" />

      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={submitDisabled}
        loading={submitting}
      >
        {/* TODO(i18n): topics.chunks.newPostForm.submit (existing key) */}
        {submitting ? 'Submitting…' : 'Submit'}
      </Button>
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
    case 'fen':
      // TODO(i18n): attachment.modal.summary.fen
      return mode.valid ? 'Position (FEN) attached.' : 'Position (FEN) attached (invalid).';
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}
