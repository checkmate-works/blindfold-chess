'use client';

import { BasePostForm } from '@/app/[locale]/(public)/topics/_components/BasePostForm';

import { createChunkPost } from '../_actions/createChunkPost';

type Props = {
  locale: string;
  slug: string;
};

export function NewPostForm({ locale, slug }: Props) {
  const boundCreatePost = createChunkPost.bind(null, locale, slug);

  return (
    <BasePostForm
      action={boundCreatePost}
      translationNamespace="topics.chunks.newPostForm"
      contentRequired
    />
  );
}
