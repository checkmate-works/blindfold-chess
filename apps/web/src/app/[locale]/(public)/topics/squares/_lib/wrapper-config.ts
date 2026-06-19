import { isValidSquare } from './squares';

/**
 * Static identity for the squares topic board, shared by every create-post
 * and create-reply Server Action wrapper so the topicType / urlSegment /
 * topic validator live in exactly one place (a typo'd urlSegment would
 * otherwise be a latent per-wrapper bug). Post wrappers additionally pass
 * `invalidTopicError` inline, since the reply bases do not accept it.
 */
export const SQUARE_TOPIC = {
  topicType: 'square',
  urlSegment: 'squares',
  validateTopic: isValidSquare,
} as const;
