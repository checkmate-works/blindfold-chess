'use client';

import { BasePostForm } from '@/app/[locale]/(public)/topics/_components/BasePostForm';

import { createPositionPuzzlePostForImageAttach } from '../_actions/createPositionPuzzlePostForImageAttach';
import { createPositionPuzzlePostWithAttachment } from '../_actions/createPositionPuzzlePostWithAttachment';
import { createPositionPuzzlePostWithFenAttachment } from '../_actions/createPositionPuzzlePostWithFenAttachment';

type Props = {
  locale: string;
  positionId: string;
};

export function NewPostForm({ locale, positionId }: Props) {
  const pgn = createPositionPuzzlePostWithAttachment.bind(null, locale, positionId);
  const fen = createPositionPuzzlePostWithFenAttachment.bind(null, locale, positionId);
  const image = createPositionPuzzlePostForImageAttach.bind(null, locale, positionId);

  return (
    <BasePostForm
      attachmentActions={{ pgn, fen, image }}
      translationNamespace="topics.positionPuzzle.newPostForm"
      contentRequired
      enableSpoilerToggle
    />
  );
}
