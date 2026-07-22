'use server';

import { revalidatePath } from 'next/cache';

import { authenticateAndGuard } from '@/lib/auth';
import { updateRepertoireDetails, updateRepertoireLinesFromPgn } from '@/lib/repertoires/mutations';
import type { UpdateRepertoireResult } from '@/lib/repertoires/mutations';
import type { RepertoireSide } from '@/lib/repertoires/validation';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * Owner-only: save a repertoire's title + side + opening links, and — when the
 * edit form's board/PGN editor changed the moves — its whole line set,
 * re-decomposed from the submitted PGN-with-variations as a diff that
 * preserves unchanged lines' identity (see `updateRepertoireLinesFromPgn`).
 * The listing shows the title, side chip and thumbnail (side flips the
 * default orientation), so the list is revalidated alongside the detail page.
 */
export async function updateRepertoire(input: {
  repertoireId: string;
  locale: string;
  name: string;
  side: RepertoireSide;
  /** Course-level blurb; trimmed to null server-side when blank. */
  description: string | null;
  openingIds: string[];
  /** The repertoire's full move tree; omitted when the moves were untouched. */
  pgn?: string;
}): Promise<UpdateRepertoireResult | { ok: false; error: string }> {
  const guard = await authenticateAndGuard(RATE_LIMITS.updateRepertoire);
  if ('error' in guard) return { ok: false, error: guard.error };

  const result = await updateRepertoireDetails({
    repertoireId: input.repertoireId,
    viewerId: guard.user.id,
    name: input.name,
    side: input.side,
    description: input.description,
    openingIds: input.openingIds,
  });
  if (!result.ok) return result;

  if (input.pgn !== undefined) {
    const movesResult = await updateRepertoireLinesFromPgn({
      repertoireId: input.repertoireId,
      viewerId: guard.user.id,
      pgn: input.pgn,
    });
    if (!movesResult.ok) return movesResult;
  }

  revalidatePath(`/${input.locale}/repertoires/${input.repertoireId}`);
  revalidatePath(`/${input.locale}/repertoires`);
  return result;
}
