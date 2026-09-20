import { getChunkBySlug } from '@/lib/chunks/queries';

/**
 * Static identity for the chunk comment surface, shared by every create-post
 * and create-reply Server Action wrapper so the topicType / urlSegment /
 * topic validator live in exactly one place (a typo'd urlSegment would
 * otherwise be a latent per-wrapper bug). Post wrappers additionally pass
 * `invalidTopicError` inline, since the reply bases do not accept it.
 *
 * `urlSegment` is unused by the wrappers that supply their own
 * `redirectPath`, but it is still part of the identity: the deletePost and
 * activity-log paths derive their URL from `chunk → 'chunks'`, and keeping
 * the mapping here is what makes those agree with the post wrappers.
 *
 * `validateTopic` re-reads the chunk rather than closing over one a wrapper
 * already fetched. `getChunkBySlug` is React.cache-wrapped, so the second
 * read is a cache hit within the same request and costs no extra query.
 */
export const CHUNK_TOPIC = {
  topicType: 'chunk',
  urlSegment: 'chunks',
  validateTopic: async (slug: string) => (await getChunkBySlug(slug)) !== null,
} as const;
