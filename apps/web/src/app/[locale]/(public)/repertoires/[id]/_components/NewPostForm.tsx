'use client';

import { BasePostForm } from '@/app/[locale]/(public)/topics/_components/BasePostForm';

import { createRepertoirePostWithAttachment } from '../_actions/createRepertoirePostWithAttachment';
import { createRepertoirePostWithFenAttachment } from '../_actions/createRepertoirePostWithFenAttachment';

type Props = {
  locale: string;
  repertoireId: string;
};

export function NewPostForm({ locale, repertoireId }: Props) {
  const pgn = createRepertoirePostWithAttachment.bind(null, locale, repertoireId);
  const fen = createRepertoirePostWithFenAttachment.bind(null, locale, repertoireId);

  return (
    <BasePostForm
      attachmentActions={{ pgn, fen }}
      translationNamespace="topics.repertoire.newPostForm"
      contentRequired
      enableSpoilerToggle={false}
    />
  );
}
