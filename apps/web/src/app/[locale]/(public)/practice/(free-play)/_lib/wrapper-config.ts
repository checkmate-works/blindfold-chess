import { getPositionById } from '@/lib/positions/queries';
import { RATE_LIMITS } from '@/lib/security/rate-limit';
import { readSpoilerFlag } from '@/lib/spoiler-flag';
import { validateContent } from '@/lib/validations/content';

import type { CreatePostParams } from '@/app/[locale]/(public)/topics/_actions/createPost';

async function positionExists(id: string, type: 'puzzle' | 'memory'): Promise<boolean> {
  return (await getPositionById({ id, type })) !== null;
}

/**
 * Static identity for the puzzle position's inline reply surface, shared by
 * every create-reply Server Action wrapper so the topicType / urlSegment /
 * topic validator live in exactly one place (a typo'd urlSegment would
 * otherwise be a latent per-wrapper bug).
 *
 * The spoiler flag is deliberately not part of this: reading it is a property
 * of the form each wrapper serves, not of the topic, and only the puzzle
 * surface exposes the toggle.
 */
export const PUZZLE_TOPIC = {
  topicType: 'position_puzzle',
  urlSegment: 'practice/puzzle',
  validateTopic: (id: string) => positionExists(id, 'puzzle'),
} as const;

/** Static identity for the position-memory inline reply surface. See {@link PUZZLE_TOPIC}. */
export const POSITION_MEMORY_TOPIC = {
  topicType: 'position_memory',
  urlSegment: 'practice/position-memory',
  validateTopic: (id: string) => positionExists(id, 'memory'),
} as const;

/** Resolve the parent once for every attachment flow's existence check and notification recipient. */
export async function getPositionPuzzlePostParams(
  locale: string,
  positionId: string,
  formData: FormData
): Promise<CreatePostParams> {
  const position = await getPositionById({ id: positionId, type: 'puzzle' });

  return {
    locale,
    topicIdentifier: positionId,
    ...PUZZLE_TOPIC,
    topicKey: positionId,
    validateTopic: () => position !== null,
    invalidTopicError: 'Invalid position',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    emitFeedItem: false,
    isSpoiler: readSpoilerFlag(formData),
    topicAuthorId: position?.userId,
    formData,
  };
}

/** Resolve the parent once for every attachment flow's existence check and notification recipient. */
export async function getPositionMemoryPostParams(
  locale: string,
  positionId: string,
  formData: FormData
): Promise<CreatePostParams> {
  const position = await getPositionById({ id: positionId, type: 'memory' });

  return {
    locale,
    topicIdentifier: positionId,
    ...POSITION_MEMORY_TOPIC,
    topicKey: positionId,
    validateTopic: () => position !== null,
    invalidTopicError: 'Invalid position',
    rateLimit: RATE_LIMITS.createPost,
    validateContent,
    emitFeedItem: false,
    topicAuthorId: position?.userId,
    formData,
  };
}
