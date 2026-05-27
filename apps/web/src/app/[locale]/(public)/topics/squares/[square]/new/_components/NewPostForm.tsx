'use client';

import { BasePostForm } from '@/app/[locale]/(public)/topics/_components/BasePostForm';

import { createSquarePostWithAttachment } from '../_actions/createSquarePostWithAttachment';
import { createSquarePostWithFenAttachment } from '../_actions/createSquarePostWithFenAttachment';

type Props = {
  locale: string;
  square: string;
};

export function NewPostForm({ locale, square }: Props) {
  const pgn = createSquarePostWithAttachment.bind(null, locale, square);
  const fen = createSquarePostWithFenAttachment.bind(null, locale, square);

  return (
    <BasePostForm
      attachmentActions={{ pgn, fen }}
      translationNamespace="topics.squares.newPostForm"
      contentRequired
    />
  );
}
