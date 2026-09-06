import { eq } from 'drizzle-orm';

import { parseBoardAnnotations } from '@/lib/board-annotations/parse';
import type { BoardAnnotations } from '@/lib/board-annotations/types';
import { isEmptyBoardAnnotations } from '@/lib/board-annotations/types';
import { db, repertoireAnnotations } from '@/lib/db';

/** A single position's owner-authored note + board markup. */
export type AnnotationView = {
  text: string;
  /** Arrows / circles drawn over the position; empty when none were drawn. */
  shapes: BoardAnnotations;
  updatedAt: Date;
};

/**
 * All owner-authored annotations for a repertoire, keyed by position key (the
 * normalised FEN after a move — see `toPositionKey`). The line detail page
 * replays a line, derives each move's resulting position key, and looks the
 * note up here, so a single query covers every move of the line (and shares
 * notes across transposing lines for free).
 */
export async function getAnnotationsForRepertoire(
  repertoireId: string
): Promise<Map<string, AnnotationView>> {
  const rows = await db
    .select({
      positionKey: repertoireAnnotations.positionKey,
      text: repertoireAnnotations.text,
      shapes: repertoireAnnotations.shapes,
      updatedAt: repertoireAnnotations.updatedAt,
    })
    .from(repertoireAnnotations)
    .where(eq(repertoireAnnotations.repertoireId, repertoireId));

  const map = new Map<string, AnnotationView>();
  for (const row of rows) {
    map.set(row.positionKey, {
      text: row.text,
      // JSONB is `unknown` as far as trust goes — parse drops anything malformed.
      shapes: parseBoardAnnotations(row.shapes),
      updatedAt: row.updatedAt,
    });
  }
  return map;
}

/**
 * {@link getAnnotationsForRepertoire}'s map split into the two records
 * `LineForm` seeds its note editor and its drawing surface from.
 *
 * Both the new-line and edit-line pages need this, and neither wants the
 * empties: a position with a blank note or nothing drawn on it would give the
 * form a key whose value is indistinguishable from "the author cleared it",
 * which is what its dirty check compares against.
 */
export function toLineFormAnnotationInputs(annotations: Map<string, AnnotationView>): {
  initialAnnotations: Record<string, string>;
  initialShapes: Record<string, BoardAnnotations>;
} {
  const entries = [...annotations];
  return {
    initialAnnotations: Object.fromEntries(
      entries.filter(([, v]) => v.text).map(([key, v]) => [key, v.text])
    ),
    initialShapes: Object.fromEntries(
      entries
        .filter(([, v]) => !isEmptyBoardAnnotations(v.shapes))
        .map(([key, v]) => [key, v.shapes])
    ),
  };
}
