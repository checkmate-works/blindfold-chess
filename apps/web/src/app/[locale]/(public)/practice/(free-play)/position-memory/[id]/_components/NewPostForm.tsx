import { BasePostForm } from '@/app/[locale]/(public)/topics/_components/BasePostForm';

import { createPositionMemoryPostForImageAttach } from '../_actions/createPositionMemoryPostForImageAttach';
import { createPositionMemoryPostWithAttachment } from '../_actions/createPositionMemoryPostWithAttachment';
import { createPositionMemoryPostWithFenAttachment } from '../_actions/createPositionMemoryPostWithFenAttachment';

type Props = {
  locale: string;
  positionId: string;
};

export function NewPostForm({ locale, positionId }: Props) {
  const pgn = createPositionMemoryPostWithAttachment.bind(null, locale, positionId);
  const fen = createPositionMemoryPostWithFenAttachment.bind(null, locale, positionId);
  const image = createPositionMemoryPostForImageAttach.bind(null, locale, positionId);

  return (
    <BasePostForm
      attachmentActions={{ pgn, fen, image }}
      translationNamespace="topics.positionMemory.newPostForm"
      contentRequired
    />
  );
}
