import { getPositionById } from '@/lib/positions/queries';

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
