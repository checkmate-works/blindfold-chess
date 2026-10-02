'use server';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { upsertAnnotation } from '@/lib/repertoires/annotation-mutations';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * Owner-only: create or replace the "why this move" note for a position within
 * a repertoire. Position-keyed, so the note follows the position across every
 * line that reaches it.
 *
 * No `revalidatePath` (and hence no `lineNo` input, which only ever named the
 * page to revalidate): `AnnotationPanel` holds the note in local state and
 * swaps in the saved text itself.
 */
export async function saveAnnotation(input: {
  repertoireId: string;
  positionKey: string;
  text: string;
}): Promise<ActionResult<{ text: string; updatedAt: Date }>> {
  const guard = await authenticateAndGuard(RATE_LIMITS.saveRepertoireAnnotation);
  if ('error' in guard) return { error: guard.error };
  const result = await upsertAnnotation({
    repertoireId: input.repertoireId,
    viewerId: guard.user.id,
    positionKey: input.positionKey,
    text: input.text,
  });
  if (!result.ok) return { error: result.error };
  return { success: true, text: result.text, updatedAt: result.updatedAt };
}
