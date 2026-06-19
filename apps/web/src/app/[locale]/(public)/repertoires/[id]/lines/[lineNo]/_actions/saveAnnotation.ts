'use server';

import { revalidatePath } from 'next/cache';

import { authenticateAndGuard } from '@/lib/auth';
import { upsertAnnotation } from '@/lib/repertoires/annotation-mutations';
import type { UpsertAnnotationResult } from '@/lib/repertoires/annotation-mutations';
import { RATE_LIMITS } from '@/lib/security/rate-limit';

/**
 * Owner-only: create or replace the "why this move" note for a position within
 * a repertoire. Position-keyed, so the note follows the position across every
 * line that reaches it; `lineNo` is only used to revalidate the page the editor
 * was invoked from.
 */
export async function saveAnnotation(input: {
  repertoireId: string;
  lineNo: number;
  positionKey: string;
  locale: string;
  text: string;
}): Promise<UpsertAnnotationResult | { ok: false; error: string }> {
  const guard = await authenticateAndGuard(RATE_LIMITS.saveRepertoireAnnotation);
  if ('error' in guard) return { ok: false, error: guard.error };
  const result = await upsertAnnotation({
    repertoireId: input.repertoireId,
    viewerId: guard.user.id,
    positionKey: input.positionKey,
    text: input.text,
  });
  if (result.ok) {
    revalidatePath(`/${input.locale}/repertoires/${input.repertoireId}/lines/${input.lineNo}`);
  }
  return result;
}
