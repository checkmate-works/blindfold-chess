import { toPositionKey } from '@blindfold-chess/features/chess-core';
import { createHash } from 'node:crypto';

/**
 * Server-only: build the position component of a `repertoire_move` topicKey.
 * Kept apart from `move-topic-key.ts` (which only parses) so the `node:crypto`
 * dependency never reaches a client bundle.
 *
 * The hash is the first 12 hex chars of SHA-256 over the normalised FEN (the
 * first four FEN fields). 48 bits is ample within a single repertoire's
 * positions, and 36 (uuid) + 1 + 12 = 49 keeps the whole key under topic_key's
 * varchar(50).
 */
export function positionHash(fen: string): string {
  return createHash('sha256').update(toPositionKey(fen)).digest('hex').slice(0, 12);
}

export function buildPositionTopicKey(repertoireId: string, fen: string): string {
  return `${repertoireId}_${positionHash(fen)}`;
}
