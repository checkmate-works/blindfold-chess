'use server';

import { revalidatePath } from 'next/cache';

import { getAuthenticatedUser } from '@/lib/auth';
import { updateRepertoireLine } from '@/lib/repertoires/mutations';
import type { UpdateLineResult } from '@/lib/repertoires/mutations';

/** Owner-only: save a line's edited title + moves. */
export async function updateLine(input: {
  repertoireId: string;
  lineNo: number;
  locale: string;
  name: string | null;
  pgn: string;
}): Promise<UpdateLineResult> {
  const user = await getAuthenticatedUser();
  const result = await updateRepertoireLine({
    repertoireId: input.repertoireId,
    lineNo: input.lineNo,
    viewerId: user.id,
    name: input.name,
    pgn: input.pgn,
  });
  if (result.ok) {
    revalidatePath(`/${input.locale}/repertoires/${input.repertoireId}/lines/${input.lineNo}`);
    revalidatePath(`/${input.locale}/repertoires/${input.repertoireId}`);
  }
  return result;
}
