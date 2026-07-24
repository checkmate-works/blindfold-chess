'use client';

import { useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPaperclip } from 'react-icons/fa';

import { revalidatePathAction } from '../_actions/revalidatePathAction';
import type { AttachAction } from '../_lib/action-types';
import { applyAttachmentMode } from '../_lib/attachment-form-data';
import { uploadPostImages } from '../_lib/upload-post-images';
import type { AggregatedAttachmentMode } from './AttachmentModal';
import { AttachmentModal } from './AttachmentModal';

// Raw server error codes returned by `/api/posts/[id]/images` mapped to the
// `attachment.image.error.*` message keys, so an image upload failure surfaces
// its actual reason (wrong format, too large, …) instead of the generic
// "Could not attach". Unknown / non-image-content codes fall through to the
// add-attachment namespace so post-state errors (deleted, not found, …) keep
// their existing messages.
const IMAGE_ERROR_KEY: Record<string, string> = {
  file_required: 'fileRequired',
  invalid_file_type: 'invalidFileType',
  file_too_large: 'fileTooLarge',
  image_too_large: 'imageTooLarge',
  animated_image_not_supported: 'animatedImageNotSupported',
  too_many_images: 'tooManyImages',
  invalid_image: 'invalidImage',
  image_processing_failed: 'invalidImage',
  upload_failed: 'uploadFailed',
  insert_failed: 'uploadFailed',
};

/**
 * The "Add attachment" affordance for a post that currently has none:
 * opens `AttachmentModal` and routes the selected kind to the matching
 * attach path — images upload directly to the existing post via the upload
 * API, PGN / FEN synthesize FormData for their Server Action. On success
 * the page is refreshed so the parent picks up the new attachment
 * server-side. Owns its own error/pending state, separate from the remove
 * flow, so a failed attach never poisons the remove banner (and vice
 * versa).
 */
export function AttachmentAddButton({
  postId,
  locale,
  attachPgnAction,
  attachFenAction,
}: {
  postId: string;
  locale: string;
  attachPgnAction?: AttachAction;
  attachFenAction?: AttachAction;
}) {
  const tAdd = useTranslations('topics.addAttachment');
  const tImgErr = useTranslations('attachment.image.error');
  const router = useRouter();
  const pathname = usePathname();

  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  // Images attach to the existing post directly via the upload API — no
  // Server Action / FormData synthesis (the post id is already in hand, so
  // the 2-step create step the new-post flow needs is moot).
  async function attachImagesDirectly(files: readonly File[]) {
    const upload = await uploadPostImages(postId, files);
    if (!upload.ok) {
      setIsAttaching(false);
      // Prefer the specific image-upload reason; fall back to the
      // add-attachment namespace for post-state codes, then the generic error.
      const imageKey = IMAGE_ERROR_KEY[upload.error];
      if (imageKey) {
        setAttachError(tImgErr(imageKey));
      } else {
        setAttachError(tAdd.has(upload.error) ? tAdd(upload.error) : tAdd('error'));
      }
      return;
    }
    // The upload API does not revalidate; bust the Full Route Cache for
    // the current page so the new image shows on refresh (without a
    // full reload), matching the PGN / FEN attach Server Actions.
    await revalidatePathAction(pathname);
    setIsAttaching(false);
    setIsAttachModalOpen(false);
    router.refresh();
  }

  async function attachViaAction(mode: AggregatedAttachmentMode) {
    const fd = new FormData();
    const applied = applyAttachmentMode(mode, fd);
    if (!applied.ok) {
      setAttachError(tAdd('invalidFen'));
      setIsAttaching(false);
      return;
    }
    const action: AttachAction | undefined =
      applied.kind === 'pgn'
        ? attachPgnAction
        : applied.kind === 'fen'
          ? attachFenAction
          : undefined;

    if (!action) {
      setAttachError(tAdd('error'));
      setIsAttaching(false);
      return;
    }

    const result = await action(postId, locale, fd);
    setIsAttaching(false);

    if ('error' in result) {
      // Try the page-local 'add' namespace first, then fall back to the
      // dotted error keys the create flow uses for PGN attachments
      // (`attachment.error.*`) and FEN attachments
      // (`postFenAttachment.error.*`).
      setAttachError(tAdd.has(result.error) ? tAdd(result.error) : tAdd('error'));
      return;
    }

    // Trigger a server re-render so the page picks up the new attachment
    // via getAttachmentsForPosts on the next render.
    setIsAttachModalOpen(false);
    router.refresh();
  }

  async function performAttach(mode: AggregatedAttachmentMode) {
    if (mode.kind === 'empty') {
      setIsAttachModalOpen(false);
      return;
    }

    setAttachError(null);
    setIsAttaching(true);

    if (mode.kind === 'image') {
      await attachImagesDirectly(mode.files);
      return;
    }
    await attachViaAction(mode);
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setIsAttachModalOpen(true)}
        disabled={isAttaching}
        className="inline-flex items-center gap-1.5 text-xs text-link-primary hover:opacity-80 transition-opacity disabled:opacity-50"
      >
        <FaPaperclip aria-hidden="true" className="h-3 w-3" />
        {tAdd('button')}
      </button>
      {attachError && <p className="mt-1 text-sm text-destructive">{attachError}</p>}
      {isAttachModalOpen && (
        <AttachmentModal
          isOpen={isAttachModalOpen}
          onClose={() => setIsAttachModalOpen(false)}
          onApply={(mode) => {
            void performAttach(mode);
          }}
        />
      )}
      {isAttaching && (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Button type="button" variant="outline" size="sm" disabled loading>
            {tAdd('attaching')}
          </Button>
        </div>
      )}
    </div>
  );
}
