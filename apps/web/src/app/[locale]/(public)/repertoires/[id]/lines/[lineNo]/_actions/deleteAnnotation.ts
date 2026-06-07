'use server';

import { revalidatePath } from 'next/cache';

import { getAuthenticatedUser } from '@/lib/auth';
import { deleteAnnotation as deleteAnnotationMutation } from '@/lib/repertoires/annotation-mutations';
import type { DeleteAnnotationResult } from '@/lib/repertoires/annotation-mutations';

/** Owner-only: remove the "why this move" note for a position. */
export async function deleteAnnotation(input: {
  repertoireId: string;
  lineNo: number;
  positionKey: string;
  locale: string;
}): Promise<DeleteAnnotationResult> {
  const user = await getAuthenticatedUser();
  const result = await deleteAnnotationMutation({
    repertoireId: input.repertoireId,
    viewerId: user.id,
    positionKey: input.positionKey,
  });
  if (result.ok) {
    revalidatePath(`/${input.locale}/repertoires/${input.repertoireId}/lines/${input.lineNo}`);
  }
  return result;
}
