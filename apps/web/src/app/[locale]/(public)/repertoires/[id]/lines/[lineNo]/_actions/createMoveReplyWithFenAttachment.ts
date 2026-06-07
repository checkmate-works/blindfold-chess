'use server';

import { parseMoveTopicKey } from '@/lib/repertoires/move-topic-key';
import { getRepertoireById } from '@/lib/repertoires/queries';
import { readSpoilerFlag } from '@/lib/spoiler-flag';

import type { CreateReplyState } from '@/app/[locale]/(public)/topics/_actions/createReply';
import { createReplyWithFenAttachmentBase } from '@/app/[locale]/(public)/topics/_actions/createReplyWithFenAttachmentBase';

/** Reply to a per-move comment (topicType 'repertoire_move'), FEN attachment. */
export async function createMoveReplyWithFenAttachment(
  locale: string,
  topicKey: string,
  postId: string,
  _prevState: CreateReplyState,
  formData: FormData
): Promise<CreateReplyState> {
  const parsed = parseMoveTopicKey(topicKey);
  if (!parsed) return { error: 'Invalid move' };
  const { repertoireId, lineNo, ply } = parsed;
  const isSpoiler = readSpoilerFlag(formData);

  return createReplyWithFenAttachmentBase({
    locale,
    topicIdentifier: topicKey,
    postId,
    topicType: 'repertoire_move',
    topicKey,
    urlSegment: 'repertoires',
    validateTopic: async () => (await getRepertoireById(repertoireId)) !== null,
    redirectPath: (_postId, replyId) =>
      `/${locale}/repertoires/${repertoireId}/lines/${lineNo}?move=${ply}&toast=post_created#post-${replyId}`,
    revalidate: () => `/${locale}/repertoires/${repertoireId}/lines/${lineNo}`,
    isSpoiler,
    formData,
  });
}
