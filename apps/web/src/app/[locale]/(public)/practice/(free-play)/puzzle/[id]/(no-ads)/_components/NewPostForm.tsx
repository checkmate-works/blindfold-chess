'use client';

import { BasePostForm } from '@/app/[locale]/(public)/topics/_components/BasePostForm';

import { createPositionPuzzlePost } from '../_actions/createPositionPuzzlePost';

type Props = {
  locale: string;
  positionId: string;
};

export function NewPostForm({ locale, positionId }: Props) {
  const action = createPositionPuzzlePost.bind(null, locale, positionId);

  return (
    <BasePostForm
      action={action}
      translationNamespace="topics.positionPuzzle.newPostForm"
      contentRequired
      enableSpoilerToggle
    />
  );
}
