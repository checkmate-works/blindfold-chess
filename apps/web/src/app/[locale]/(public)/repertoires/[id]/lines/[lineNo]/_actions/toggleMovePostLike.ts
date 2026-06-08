'use server';

import { REPERTOIRE_MOVE_TOPIC_TYPE, parseMoveTopicKey } from '@/lib/repertoires/move-topic-key';
import { getRepertoireById } from '@/lib/repertoires/queries';

import { toggleLikeBase } from '@/app/[locale]/(public)/topics/_actions/toggleLike';

import { resolveMoveLinePath } from '../_lib/move-comment-config';

/** Like / unlike a per-move comment (topicType 'repertoire_move'). */
export async function toggleMovePostLike(postId: string, locale: string, topicKey: string) {
  const parsed = parseMoveTopicKey(topicKey);
  if (!parsed) return { error: 'Invalid move' };
  const { repertoireId, positionHash } = parsed;
  const { path } = await resolveMoveLinePath(locale, repertoireId, positionHash, false);

  return toggleLikeBase({
    postId,
    locale,
    topicIdentifier: topicKey,
    topicType: REPERTOIRE_MOVE_TOPIC_TYPE,
    urlSegment: 'repertoires',
    validateTopic: async () => (await getRepertoireById(repertoireId)) !== null,
    revalidate: () => [path],
  });
}
