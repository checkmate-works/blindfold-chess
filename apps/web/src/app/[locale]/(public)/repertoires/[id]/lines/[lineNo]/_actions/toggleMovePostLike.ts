'use server';

import { REPERTOIRE_MOVE_TOPIC_TYPE, parseMoveTopicKey } from '@/lib/repertoires/move-topic-key';
import { getRepertoireById } from '@/lib/repertoires/queries';

import { toggleLikeBase } from '@/app/[locale]/(public)/topics/_actions/toggleLike';

/**
 * Like / unlike a per-move comment (topicType 'repertoire_move').
 *
 * No longer resolves the owning line's URL: that `resolveMoveLinePath` lookup
 * existed only to name a path for `revalidatePath`, which this flow no longer
 * calls (see `toggleLikeBase`), so liking a move comment costs one DB query
 * less than it used to.
 */
export async function toggleMovePostLike(postId: string, locale: string, topicKey: string) {
  const parsed = parseMoveTopicKey(topicKey);
  if (!parsed) return { error: 'Invalid move' };
  const { repertoireId } = parsed;

  return toggleLikeBase({
    postId,
    locale,
    topicIdentifier: topicKey,
    topicType: REPERTOIRE_MOVE_TOPIC_TYPE,
    validateTopic: async () => (await getRepertoireById(repertoireId)) !== null,
  });
}
