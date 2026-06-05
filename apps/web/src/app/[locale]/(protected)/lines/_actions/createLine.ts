'use server';

import { revalidatePath } from 'next/cache';

import type { CreateLineResult } from '@/lib/lines/mutations';
import { createLineEntry } from '@/lib/lines/mutations';
import type { LineSide } from '@/lib/lines/validation';

/**
 * Create a repertoire line for the current user, then revalidate the list so a
 * subsequent navigation back to `/lines` shows the new row.
 */
export async function createLine(input: {
  name: string;
  side: LineSide;
  pgn: string;
  locale: string;
}): Promise<CreateLineResult> {
  const result = await createLineEntry({
    name: input.name,
    side: input.side,
    pgn: input.pgn,
  });
  if ('success' in result) {
    revalidatePath(`/${input.locale}/lines`);
  }
  return result;
}
