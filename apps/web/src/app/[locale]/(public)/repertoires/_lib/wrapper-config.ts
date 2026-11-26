import { getRepertoireById } from '@/lib/repertoires/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { readSpoilerFlag } from '@/lib/spoiler-flag';
import { validateContent } from '@/lib/validations/content';

import type { CreatePostParams } from '@/app/[locale]/(public)/topics/_actions/createPost';

/**
 * Static identity for the repertoire comment surface, shared by every
 * create-reply Server Action wrapper so the topicType / urlSegment / topic
 * validator live in exactly one place (a typo'd urlSegment would otherwise be
 * a latent per-wrapper bug).
 */
export const REPERTOIRE_TOPIC = {
  topicType: 'repertoire',
  urlSegment: 'repertoires',
  validateTopic: async (id: string) => (await getRepertoireById(id)) !== null,
} as const;

/** Resolve the parent once for every attachment flow's existence check and notification recipient. */
export async function getRepertoirePostParams(
  locale: string,
  repertoireId: string,
  formData: FormData
): Promise<CreatePostParams> {
  const repertoire = await getRepertoireById(repertoireId);

  return {
    locale,
    topicIdentifier: repertoireId,
    ...REPERTOIRE_TOPIC,
    topicKey: repertoireId,
    validateTopic: () => repertoire !== null,
    invalidTopicError: 'Invalid repertoire',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    emitFeedItem: false,
    isSpoiler: readSpoilerFlag(formData),
    topicAuthorId: repertoire?.userId,
    formData,
  };
}
