'use server';

import { revalidatePath } from 'next/cache';

import type { DeleteLineResult } from '@/lib/lines/mutations';
import { deleteLineEntry } from '@/lib/lines/mutations';

/** Delete one of the current user's lines, then revalidate the list. */
export async function deleteLine(input: { id: string; locale: string }): Promise<DeleteLineResult> {
  const result = await deleteLineEntry(input.id);
  if ('success' in result) {
    revalidatePath(`/${input.locale}/lines`);
  }
  return result;
}
