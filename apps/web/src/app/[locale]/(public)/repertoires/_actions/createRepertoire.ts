'use server';

import { revalidatePath } from 'next/cache';

import type { CreateRepertoireResult } from '@/lib/repertoires/mutations';
import { createRepertoireEntry } from '@/lib/repertoires/mutations';
import type { RepertoirePhase, RepertoireSide } from '@/lib/repertoires/validation';

/**
 * Create a repertoire (型) for the current user from a pasted PGN, then
 * revalidate the list so a navigation back to /repertoires shows the new course.
 */
export async function createRepertoire(input: {
  name: string;
  side: RepertoireSide;
  phase: RepertoirePhase;
  description?: string | null;
  pgn: string;
  openingIds?: string[];
  /** Position-keyed "why this move" notes authored in board mode. */
  annotations?: Record<string, string>;
  /** Position-keyed board markup (arrows / circles) drawn in board mode. */
  shapes?: Record<string, unknown>;
  locale: string;
}): Promise<CreateRepertoireResult> {
  const result = await createRepertoireEntry({
    name: input.name,
    side: input.side,
    phase: input.phase,
    description: input.description,
    pgn: input.pgn,
    openingIds: input.openingIds,
    annotations: input.annotations,
    shapes: input.shapes,
  });
  if ('success' in result) {
    revalidatePath(`/${input.locale}/repertoires`);
  }
  return result;
}
