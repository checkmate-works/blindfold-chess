'use server';

import { parseMoveTopicKey } from '@/lib/repertoires/move-topic-key';
import { getRepertoireById } from '@/lib/repertoires/queries';
import { resolveLineForPosition } from '@/lib/repertoires/resolve-line-position';

import { toggleLikeBase } from '@/app/[locale]/(public)/topics/_actions/toggleLike';

/** Like / unlike a per-move comment (topicType 'repertoire_move'). */
export async function toggleMovePostLike(postId: string, locale: string, topicKey: string) {
  const parsed = parseMoveTopicKey(topicKey);
  if (!parsed) return { error: 'Invalid move' };
  const { repertoireId, positionHash } = parsed;
  const resolved = await resolveLineForPosition(repertoireId, positionHash);
  const linePath = resolved
    ? `/${locale}/repertoires/${repertoireId}/lines/${resolved.lineNo}`
    : `/${locale}/repertoires/${repertoireId}`;

  return toggleLikeBase({
    postId,
    locale,
    topicIdentifier: topicKey,
    topicType: 'repertoire_move',
    urlSegment: 'repertoires',
    validateTopic: async () => (await getRepertoireById(repertoireId)) !== null,
    revalidate: () => [linePath],
  });
}
