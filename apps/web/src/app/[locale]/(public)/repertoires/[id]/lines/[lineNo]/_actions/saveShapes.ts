'use server';

import type { ActionResult } from '@/lib/action-types';
import { authenticateAndGuard } from '@/lib/auth';
import { parseBoardAnnotations } from '@/lib/board-annotations/parse';
import { saveAnnotationShapes } from '@/lib/repertoires/annotation-mutations';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * Owner-only: replace the arrows / circles drawn over a position. Called on
 * every stroke (debounced client-side), so it deliberately does NOT
 * `revalidatePath` — the board already shows the new shapes optimistically, and
 * re-rendering the whole line page (comments, ads, thread) per stroke would be
 * pure waste. A fresh load reads the saved shapes from the DB.
 *
 * The payload crosses the network as JSON, so it is re-parsed here rather than
 * trusted: `parseBoardAnnotations` drops any element that isn't a well-formed
 * arrow / circle.
 */
export async function saveShapes(input: {
  repertoireId: string;
  positionKey: string;
  shapes: unknown;
}): Promise<ActionResult> {
  const guard = await authenticateAndGuard(RATE_LIMITS.saveRepertoireShapes);
  if ('error' in guard) return { error: guard.error };

  const result = await saveAnnotationShapes({
    repertoireId: input.repertoireId,
    viewerId: guard.user.id,
    positionKey: input.positionKey,
    shapes: parseBoardAnnotations(input.shapes),
  });
  if (!result.ok) return { error: result.error };
  return { success: true };
}
