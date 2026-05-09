import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';
import type { PgTableWithColumns } from 'drizzle-orm/pg-core';

import type { ActionResult } from '@/lib/action-types';
import { db } from '@/lib/db';

import { requireAdmin } from './auth';

export type DeleteResult = ActionResult;
export type MutationResult = ActionResult<{ id: string }>;

type DeleteConfig = {
  /** Drizzle table reference */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: PgTableWithColumns<any>;
  /** Path to revalidate after deletion */
  revalidationPath: string;
};

/**
 * Generic admin delete action factory.
 *
 * Returns an async function that:
 * 1. Verifies admin auth
 * 2. Deletes the row by `id`
 * 3. Revalidates the given path
 */
export function createAdminDeleteAction(config: DeleteConfig) {
  return async (id: string): Promise<DeleteResult> => {
    const auth = await requireAdmin();
    if ('error' in auth) {
      return auth;
    }

    await db.delete(config.table).where(eq(config.table.id, id));

    revalidatePath(config.revalidationPath);

    return { success: true };
  };
}

/**
 * Run the common admin auth + validation guard for create/update actions.
 *
 * Returns `null` when checks pass, or an error result to short-circuit.
 */
export async function adminMutationGuard<T>(
  data: T,
  validate: (data: T) => string | null
): Promise<{ error: string } | null> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  const validationError = validate(data);
  if (validationError) {
    return { error: validationError };
  }

  return null;
}

/**
 * Revalidate a path and return a success result with the given id.
 */
export function mutationSuccess(id: string, revalidationPath: string): MutationResult {
  revalidatePath(revalidationPath);
  return { success: true, id };
}
