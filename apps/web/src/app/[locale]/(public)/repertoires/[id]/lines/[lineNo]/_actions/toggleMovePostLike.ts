'use server';

import { parseMoveTopicKey } from '@/lib/repertoires/move-topic-key';
import { getRepertoireById } from '@/lib/repertoires/queries';

import { toggleLikeBase } from '@/app/[locale]/(public)/topics/_actions/toggleLike';

/** Like / unlike a per-move comment (topicType 'repertoire_move'). */
export async function toggleMovePostLike(postId: string, locale: string, topicKey: string) {
  const parsed = parseMoveTopicKey(topicKey);
  if (!parsed) return { error: 'Invalid move' };
  const { repertoireId, lineNo } = parsed;

  return toggleLikeBase({
    postId,
    locale,
    topicIdentifier: topicKey,
    topicType: 'repertoire_move',
    urlSegment: 'repertoires',
    validateTopic: async () => (await getRepertoireById(repertoireId)) !== null,
    revalidate: () => [`/${locale}/repertoires/${repertoireId}/lines/${lineNo}`],
  });
}
