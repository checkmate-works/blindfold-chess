'use client';

import { useCallback, useState } from 'react';

import type { AttachmentInputMode } from '@/app/[locale]/(public)/topics/_components/AttachmentInput';
import { AttachmentInput } from '@/app/[locale]/(public)/topics/_components/AttachmentInput';
import { BasePostForm } from '@/app/[locale]/(public)/topics/_components/BasePostForm';

import { createChunkPostWithAttachment } from '../_actions/createChunkPostWithAttachment';
import { createChunkPostWithEmbedAttachment } from '../_actions/createChunkPostWithEmbedAttachment';

type Props = {
  locale: string;
  slug: string;
};

/**
 * New-post form for chunk topics.
 *
 * @description
 * SPEC2 Phase B: the attachment input now accepts iframe embed URLs in
 * addition to PGN / Lichess game URLs. The form picks the right Server
 * Action based on `AttachmentInput`'s reported mode:
 *   - `pgn` (or `empty`): `createChunkPostWithAttachment`
 *   - `embed`:           `createChunkPostWithEmbedAttachment`
 *
 * Server-side re-validation re-parses the input regardless of the
 * client-reported mode, so a tampered hidden `embedProvider` field
 * cannot smuggle past the URL parsers.
 */
export function NewPostForm({ locale, slug }: Props) {
  const [attachmentMode, setAttachmentMode] = useState<AttachmentInputMode>({ kind: 'empty' });

  const handleModeChange = useCallback((mode: AttachmentInputMode) => {
    setAttachmentMode((prev) => {
      // Skip state update if nothing changed (avoid extra renders).
      if (prev.kind !== mode.kind) return mode;
      if (prev.kind === 'embed' && mode.kind === 'embed') {
        if (prev.provider === mode.provider && prev.sourceUrl === mode.sourceUrl) return prev;
      } else {
        return prev;
      }
      return mode;
    });
  }, []);

  const action =
    attachmentMode.kind === 'embed'
      ? createChunkPostWithEmbedAttachment.bind(null, locale, slug)
      : createChunkPostWithAttachment.bind(null, locale, slug);

  return (
    <BasePostForm
      action={action}
      translationNamespace="topics.chunks.newPostForm"
      contentRequired
      beforeContent={(markDirty) => (
        <AttachmentInput onChange={() => markDirty()} onModeChange={handleModeChange} />
      )}
    />
  );
}
