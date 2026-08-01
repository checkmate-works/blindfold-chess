import { parsePgn, replayMoves } from '@blindfold-chess/features/chess-core';
import { and, eq, isNull } from 'drizzle-orm';

import { db, repertoireChapters, repertoireLines } from '@/lib/db';

import type { LinePosition, ScannableLine } from './line-position-scan';
import { scanLinesForPositionKeys } from './line-position-scan';
import { positionHash } from './position-topic-key';
import { linesInDisplayOrder } from './queries';

export type ResolvedLinePosition = { lineNo: number; ply: number };

/**
 * A repertoire's live lines in display order (chapter, then within-chapter —
 * `seq` alone would interleave chapters now that it is chapter-scoped), so a
 * "first match" over them is the first line a reader scanning the sidebar
 * would meet.
 */
async function fetchScannableLines(repertoireId: string): Promise<ScannableLine[]> {
  return db
    .select({
      pgn: repertoireLines.pgn,
      startingFen: repertoireLines.startingFen,
      lineNo: repertoireLines.lineNo,
    })
    .from(repertoireLines)
    .leftJoin(repertoireChapters, eq(repertoireChapters.id, repertoireLines.chapterId))
    .where(and(eq(repertoireLines.repertoireId, repertoireId), isNull(repertoireLines.deletedAt)))
    .orderBy(...linesInDisplayOrder);
}

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
  const lines = await fetchScannableLines(repertoireId);

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
        return { lineNo: line.lineNo, ply };
      }
    }
  }
  return null;
}

/**
 * Batch sibling of {@link resolveLineForPosition}, keyed by full
 * `position_key`s (not hashes): resolve each key to the first (lineNo, ply)
 * that reaches it, in one replay pass over the repertoire's lines. Keys no
 * live line reaches are absent from the result — the caller treats those
 * links as orphaned (`repertoire_chunks` display contract: stop rendering,
 * don't garbage-collect). Used by the chunk detail page's Kata tab to turn a
 * position-keyed link into a `?move=` deep link.
 */
export async function resolveLinePositionsForKeys(
  repertoireId: string,
  positionKeys: Iterable<string>
): Promise<Map<string, LinePosition>> {
  const lines = await fetchScannableLines(repertoireId);
  return scanLinesForPositionKeys(lines, positionKeys);
}
