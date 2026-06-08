import { parsePgn, replayMoves } from '@blindfold-chess/features/chess-core';
import { and, asc, eq, isNull } from 'drizzle-orm';

import { db, repertoireLines } from '@/lib/db';

import { positionHash } from './position-topic-key';

export type ResolvedLinePosition = { lineNo: number; ply: number };

/**
 * Find a concrete (lineNo, ply) in a repertoire that reaches the position a
 * `repertoire_move` thread is keyed to. The thread key carries only the
 * position hash, so redirects (reply) and notification deep links use this to
 * recover a place to land. Returns the first match in line/move order, or null
 * if no current line reaches it (e.g. the move was edited away).
 */
export async function resolveLineForPosition(
  repertoireId: string,
  targetHash: string
): Promise<ResolvedLinePosition | null> {
  const lines = await db
    .select({
      pgn: repertoireLines.pgn,
      startingFen: repertoireLines.startingFen,
      seq: repertoireLines.seq,
    })
    .from(repertoireLines)
    .where(and(eq(repertoireLines.repertoireId, repertoireId), isNull(repertoireLines.deletedAt)))
    .orderBy(asc(repertoireLines.seq));

  for (const line of lines) {
    let sans: string[] = [];
    try {
      sans = parsePgn(line.pgn);
    } catch {
      continue;
    }
    const positions = replayMoves(sans, line.startingFen ?? undefined);
    // positions[0] is the start; positions[i] is the position after ply i.
    for (let ply = 1; ply < positions.length; ply++) {
      if (positionHash(positions[ply].fen) === targetHash) {
        return { lineNo: line.seq + 1, ply };
      }
    }
  }
  return null;
}
