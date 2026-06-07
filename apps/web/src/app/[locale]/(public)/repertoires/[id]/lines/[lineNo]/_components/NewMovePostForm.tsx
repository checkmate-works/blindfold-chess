'use client';

import { BasePostForm } from '@/app/[locale]/(public)/topics/_components/BasePostForm';

import { createMovePostWithAttachment } from '../_actions/createMovePostWithAttachment';
import { createMovePostWithFenAttachment } from '../_actions/createMovePostWithFenAttachment';

type Props = {
  locale: string;
  /** The move's topic key: `${repertoireId}_${lineNo}_${ply}`. */
  topicKey: string;
};

/** Compose form for a top-level comment on the focused move. */
export function NewMovePostForm({ locale, topicKey }: Props) {
  const pgn = createMovePostWithAttachment.bind(null, locale, topicKey);
  const fen = createMovePostWithFenAttachment.bind(null, locale, topicKey);

  return (
    <BasePostForm
      attachmentActions={{ pgn, fen }}
      translationNamespace="topics.repertoire_move.newPostForm"
      contentRequired
      enableSpoilerToggle={false}
    />
  );
}
