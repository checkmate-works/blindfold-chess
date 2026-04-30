'use client';

import { BasePostForm } from '@/app/[locale]/(public)/topics/_components/BasePostForm';

import { createChunkPostWithAttachment } from '../_actions/createChunkPostWithAttachment';

type Props = {
  locale: string;
  slug: string;
};

/**
 * New-post form for chunk topics.
 *
 * @description
 * The attachment entry point is intentionally not rendered while the
 * attachment feature is hidden from end users. The Server Action still
 * handles posts without an attachment via its empty-attachment fast path,
 * so this form behaves like a plain comment form. Re-mounting
 * `<AttachmentInput>` is the only change required to re-enable the flow.
 */
export function NewPostForm({ locale, slug }: Props) {
  const action = createChunkPostWithAttachment.bind(null, locale, slug);

  return (
    <BasePostForm
      action={action}
      translationNamespace="topics.chunks.newPostForm"
      contentRequired
    />
  );
}
