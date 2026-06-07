'use server';

import { revalidatePath } from 'next/cache';

import { getAuthenticatedUser } from '@/lib/auth';
import { upsertAnnotation } from '@/lib/repertoires/annotation-mutations';
import type { UpsertAnnotationResult } from '@/lib/repertoires/annotation-mutations';

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
}): Promise<UpsertAnnotationResult> {
  const user = await getAuthenticatedUser();
  const result = await upsertAnnotation({
    repertoireId: input.repertoireId,
    viewerId: user.id,
    positionKey: input.positionKey,
    text: input.text,
  });
  if (result.ok) {
    revalidatePath(`/${input.locale}/repertoires/${input.repertoireId}/lines/${input.lineNo}`);
  }
  return result;
}
