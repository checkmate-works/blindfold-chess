import { isValidOpening } from './queries';

/**
 * Static identity for the openings topic board, shared by every create-post
 * and create-reply Server Action wrapper so the topicType / urlSegment /
 * topic validator live in exactly one place (a typo'd urlSegment would
 * otherwise be a latent per-wrapper bug). Post wrappers additionally pass
 * `invalidTopicError` inline, since the reply bases do not accept it.
 */
export const OPENING_TOPIC = {
  topicType: 'opening',
  urlSegment: 'openings',
  validateTopic: isValidOpening,
} as const;
