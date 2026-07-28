'use server';

import type { RepertoireVisibility } from '@/lib/points/spend-catalog';
import type { CreateRepertoireResult } from '@/lib/repertoires/mutations';
import { createRepertoireEntry } from '@/lib/repertoires/mutations';
import type { RepertoirePhase, RepertoireSide } from '@/lib/repertoires/validation';

/**
 * Create a repertoire (型) for the current user from a pasted PGN.
 *
 * No `revalidatePath`: /repertoires is a dynamic route and
 * `RepertoireImportForm` `router.push`es to the new course on success, so the
 * navigation re-queries the list on its own. See the note on
 * `performEntityToggleLike` in `@/lib/db/like-actions`.
 */
export async function createRepertoire(input: {
  name: string;
  side: RepertoireSide;
  phase: RepertoirePhase;
  description?: string | null;
  pgn: string;
  /** Visibility to create-and-publish at (coin-gated). Absent → public (free). */
  visibility?: RepertoireVisibility;
  openingIds?: string[];
  /** Position-keyed "why this move" notes authored in board mode. */
  annotations?: Record<string, string>;
  /** Position-keyed board markup (arrows / circles) drawn in board mode. */
  shapes?: Record<string, unknown>;
}): Promise<CreateRepertoireResult> {
  const result = await createRepertoireEntry({
    name: input.name,
    side: input.side,
    phase: input.phase,
    description: input.description,
    pgn: input.pgn,
    visibility: input.visibility,
    openingIds: input.openingIds,
    annotations: input.annotations,
    shapes: input.shapes,
  });
  return result;
}
