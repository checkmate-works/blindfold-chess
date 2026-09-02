import { getRepertoireById } from '@/lib/repertoires/queries';

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
