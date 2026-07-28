'use server';

import type { DeleteRepertoireResult } from '@/lib/repertoires/mutations';
import { deleteRepertoireEntry } from '@/lib/repertoires/mutations';

/**
 * Soft-delete one of the current user's repertoires.
 *
 * No `revalidatePath`: `RepertoireActionsMenu` `router.push`es to
 * /repertoires, and that dynamic route re-queries on navigation.
 */
export async function deleteRepertoire(input: { id: string }): Promise<DeleteRepertoireResult> {
  return deleteRepertoireEntry(input.id);
}
