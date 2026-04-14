'use client';

import { BasePostForm } from '@/app/[locale]/(public)/topics/_components/BasePostForm';

import { createPost } from '../_actions/createPost';

type Props = {
  locale: string;
  square: string;
};

export function NewPostForm({ locale, square }: Props) {
  const boundCreatePost = createPost.bind(null, locale, square);

  return (
    <BasePostForm
      action={boundCreatePost}
      translationNamespace="topics.squares.newPostForm"
      contentRequired
    />
  );
}
