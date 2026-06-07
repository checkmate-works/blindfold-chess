'use client';

import { BasePostForm } from '@/app/[locale]/(public)/topics/_components/BasePostForm';

import { createMovePostWithAttachment } from '../_actions/createMovePostWithAttachment';
import { createMovePostWithFenAttachment } from '../_actions/createMovePostWithFenAttachment';

type Props = {
  locale: string;
  /** Position-based thread key: `${repertoireId}_${positionHash}`. */
  topicKey: string;
  /** Current line + ply — only so the post redirect lands back on this move. */
  lineNo: number;
  ply: number;
};

/** Compose form for a top-level comment on the focused move. */
export function NewMovePostForm({ locale, topicKey, lineNo, ply }: Props) {
  const pgn = createMovePostWithAttachment.bind(null, locale, topicKey, lineNo, ply);
  const fen = createMovePostWithFenAttachment.bind(null, locale, topicKey, lineNo, ply);

  return (
    <BasePostForm
      attachmentActions={{ pgn, fen }}
      translationNamespace="topics.repertoire_move.newPostForm"
      contentRequired
      enableSpoilerToggle={false}
    />
  );
}
