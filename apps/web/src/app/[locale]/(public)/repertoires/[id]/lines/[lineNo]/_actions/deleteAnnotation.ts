'use server';

import { revalidatePath } from 'next/cache';

import { authenticateAndGuard } from '@/lib/auth';
import { deleteAnnotation as deleteAnnotationMutation } from '@/lib/repertoires/annotation-mutations';
import type { DeleteAnnotationResult } from '@/lib/repertoires/annotation-mutations';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/** Owner-only: remove the "why this move" note for a position. */
export async function deleteAnnotation(input: {
  repertoireId: string;
  lineNo: number;
  positionKey: string;
  locale: string;
}): Promise<DeleteAnnotationResult | { ok: false; error: string }> {
  const guard = await authenticateAndGuard(RATE_LIMITS.deleteRepertoireAnnotation);
  if ('error' in guard) return { ok: false, error: guard.error };
  const result = await deleteAnnotationMutation({
    repertoireId: input.repertoireId,
    viewerId: guard.user.id,
    positionKey: input.positionKey,
  });
  if (result.ok) {
    revalidatePath(`/${input.locale}/repertoires/${input.repertoireId}/lines/${input.lineNo}`);
  }
  return result;
}
