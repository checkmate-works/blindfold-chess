'use client';

import { AttachmentInput } from '@/app/[locale]/(public)/topics/_components/AttachmentInput';
import { BasePostForm } from '@/app/[locale]/(public)/topics/_components/BasePostForm';

import { createChunkPostWithAttachment } from '../_actions/createChunkPostWithAttachment';

type Props = {
  locale: string;
  slug: string;
};

export function NewPostForm({ locale, slug }: Props) {
  const boundCreatePost = createChunkPostWithAttachment.bind(null, locale, slug);

  return (
    <BasePostForm
      action={boundCreatePost}
      translationNamespace="topics.chunks.newPostForm"
      contentRequired
      beforeContent={(markDirty) => <AttachmentInput onChange={() => markDirty()} />}
    />
  );
}
