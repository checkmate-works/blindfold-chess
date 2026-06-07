/**
 * Per-move comment threads live in `topic_posts` under topicType
 * 'repertoire_move'. The thread is keyed to a POSITION, not a line + ply, so it
 * survives line edits for free (the same reason annotations are position-keyed):
 * editing a line's moves never orphans a thread as long as the position is still
 * reached somewhere, and transposing lines within a repertoire share one thread.
 *
 * The topicKey packs `${repertoireId}_${positionHash}` into topic_key's
 * varchar(50): the repertoire id is a UUID (36, hyphens, never underscores) and
 * `positionHash` is a short hex digest of the normalised FEN (see
 * `position-topic-key.ts`), so 36 + 1 + 12 = 49 fits and splits on the first
 * '_'. Scoping by repertoire keeps each repertoire's discussion separate.
 *
 * The key intentionally does NOT carry the line / ply: a position can be reached
 * by several lines, so "which line" is resolved separately
 * (`resolve-line-position.ts`) for redirects and notification deep links.
 */
export const REPERTOIRE_MOVE_TOPIC_TYPE = 'repertoire_move';

export type ParsedMoveTopicKey = { repertoireId: string; positionHash: string };

export function parseMoveTopicKey(topicKey: string): ParsedMoveTopicKey | null {
  const idx = topicKey.indexOf('_');
  if (idx <= 0) return null;
  const repertoireId = topicKey.slice(0, idx);
  const positionHash = topicKey.slice(idx + 1);
  if (!repertoireId || !positionHash) return null;
  return { repertoireId, positionHash };
}
