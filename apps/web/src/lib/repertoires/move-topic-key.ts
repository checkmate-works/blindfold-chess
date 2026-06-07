/**
 * Per-move comment threads live in `topic_posts` under topicType
 * 'repertoire_move'. The topicKey packs the three coordinates a move needs
 * — `${repertoireId}_${lineNo}_${ply}` — into the varchar(50) column. Only the
 * repertoire id is a UUID (hyphens, never underscores); lineNo (the line's
 * seq + 1) and ply are small integers, so the whole key is well under 50 chars
 * and splits cleanly on '_'. Keeping all three in the key means the like /
 * reply / delete / notification paths can rebuild the line URL from the key
 * alone (no extra lookup), which is why the line detail route is nested.
 */
export const REPERTOIRE_MOVE_TOPIC_TYPE = 'repertoire_move';

export function buildMoveTopicKey(repertoireId: string, lineNo: number, ply: number): string {
  return `${repertoireId}_${lineNo}_${ply}`;
}

export type ParsedMoveTopicKey = { repertoireId: string; lineNo: number; ply: number };

export function parseMoveTopicKey(topicKey: string): ParsedMoveTopicKey | null {
  const parts = topicKey.split('_');
  if (parts.length !== 3) return null;
  const [repertoireId, lineNoStr, plyStr] = parts;
  const lineNo = Number(lineNoStr);
  const ply = Number(plyStr);
  if (!repertoireId || !Number.isInteger(lineNo) || !Number.isInteger(ply)) return null;
  return { repertoireId, lineNo, ply };
}
