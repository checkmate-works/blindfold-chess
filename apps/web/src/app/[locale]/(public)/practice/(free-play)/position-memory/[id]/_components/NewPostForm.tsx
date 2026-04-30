'use client';

import { BasePostForm } from '@/app/[locale]/(public)/topics/_components/BasePostForm';

import { createPositionMemoryPost } from '../_actions/createPositionMemoryPost';

type Props = {
  locale: string;
  positionId: string;
};

export function NewPostForm({ locale, positionId }: Props) {
  const action = createPositionMemoryPost.bind(null, locale, positionId);

  return (
    <BasePostForm
      action={action}
      translationNamespace="topics.positionMemory.newPostForm"
      contentRequired
    />
  );
}
