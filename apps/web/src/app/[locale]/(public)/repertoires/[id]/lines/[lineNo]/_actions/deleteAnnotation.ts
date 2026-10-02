'use server';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { deleteAnnotation as deleteAnnotationMutation } from '@/lib/repertoires/annotation-mutations';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * Owner-only: remove the "why this move" note for a position.
 *
 * No `revalidatePath`: `AnnotationPanel` clears its local copy on success.
 */
export async function deleteAnnotation(input: {
  repertoireId: string;
  positionKey: string;
}): Promise<ActionResult> {
  const guard = await authenticateAndGuard(RATE_LIMITS.deleteRepertoireAnnotation);
  if ('error' in guard) return { error: guard.error };
  const result = await deleteAnnotationMutation({
    repertoireId: input.repertoireId,
    viewerId: guard.user.id,
    positionKey: input.positionKey,
  });
  if (!result.ok) return { error: result.error };
  return { success: true };
}
