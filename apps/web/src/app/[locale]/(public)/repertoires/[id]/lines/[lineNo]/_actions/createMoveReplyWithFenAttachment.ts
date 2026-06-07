'use server';

import { parseMoveTopicKey } from '@/lib/repertoires/move-topic-key';
import { getRepertoireById } from '@/lib/repertoires/queries';
import { resolveLineForPosition } from '@/lib/repertoires/resolve-line-position';
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
  const { repertoireId, positionHash } = parsed;
  const isSpoiler = readSpoilerFlag(formData);
  const resolved = await resolveLineForPosition(repertoireId, positionHash);
  const linePath = resolved
    ? `/${locale}/repertoires/${repertoireId}/lines/${resolved.lineNo}?move=${resolved.ply}`
    : `/${locale}/repertoires/${repertoireId}`;

  return createReplyWithFenAttachmentBase({
    locale,
    topicIdentifier: topicKey,
    postId,
    topicType: 'repertoire_move',
    topicKey,
    urlSegment: 'repertoires',
    validateTopic: async () => (await getRepertoireById(repertoireId)) !== null,
    redirectPath: (_postId, replyId) =>
      `${linePath}${resolved ? '&' : '?'}toast=post_created#post-${replyId}`,
    revalidate: () => linePath.split('?')[0],
    isSpoiler,
    formData,
  });
}
