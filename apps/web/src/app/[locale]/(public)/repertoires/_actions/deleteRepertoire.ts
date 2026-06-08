'use server';

import { revalidatePath } from 'next/cache';

import type { DeleteRepertoireResult } from '@/lib/repertoires/mutations';
import { deleteRepertoireEntry } from '@/lib/repertoires/mutations';

/** Soft-delete one of the current user's repertoires, then revalidate the list. */
export async function deleteRepertoire(input: {
  id: string;
  locale: string;
}): Promise<DeleteRepertoireResult> {
  const result = await deleteRepertoireEntry(input.id);
  if ('success' in result) {
    revalidatePath(`/${input.locale}/repertoires`);
  }
  return result;
}
