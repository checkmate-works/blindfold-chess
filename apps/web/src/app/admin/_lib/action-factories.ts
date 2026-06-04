import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';
import type { PgTableWithColumns } from 'drizzle-orm/pg-core';

import type { ActionResult } from '@/lib/action-types';
import { db } from '@/lib/db';
import { extractPgErrorCode } from '@/lib/db/extract-pg-error-code';

import { requireAdmin } from './auth';

export type DeleteResult = ActionResult;
export type MutationResult = ActionResult<{ id: string }>;

type DeleteConfig = {
  /** Drizzle table reference */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: PgTableWithColumns<any>;
  /** Path to revalidate after deletion */
  revalidationPath: string;
  /**
   * Optional side effect to run after a successful delete + revalidate.
   * Use for tag invalidation, cache clears, or audit-log writes that
   * shouldn't be part of every delete. Receives the deleted row id.
   *
   * Errors thrown here propagate to the caller — the delete itself has
   * already happened, so callers should treat throws as "side-effect
   * failed, retry the side effect" rather than "delete failed".
   */
  postDeleteHook?: (id: string) => Promise<void>;
};

/**
 * Generic admin delete action factory.
 *
 * Returns an async function that:
 * 1. Verifies admin auth
 * 2. Deletes the row by `id`
 * 3. Revalidates the given path
 * 4. Runs `postDeleteHook` if provided
 */
export function createAdminDeleteAction(config: DeleteConfig) {
  return async (id: string): Promise<DeleteResult> => {
    const auth = await requireAdmin();
    if ('error' in auth) {
      return auth;
    }

    await db.delete(config.table).where(eq(config.table.id, id));

    revalidatePath(config.revalidationPath);

    if (config.postDeleteHook) {
      await config.postDeleteHook(id);
    }

    return { success: true };
  };
}

/**
 * Look up a row by id under an admin update flow. Returns `null` when the
 * row exists, or `{ error: 'not found' }` when it doesn't — the standard
 * shape callers proxy to their own return.
 *
 * Centralises the recurring `select…where(eq(t.id, id)).limit(1)` +
 * `if (!current) return { error: 'not found' }` pair so admin update
 * actions only need a single line for the existence check.
 */
export async function adminFindOrFail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: PgTableWithColumns<any>,
  id: string
): Promise<{ error: string } | null> {
  const [row] = await db.select().from(table).where(eq(table.id, id)).limit(1);
  if (!row) return { error: 'not found' };
  return null;
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

/**
 * Translate a Postgres unique-violation (23505) thrown by an admin
 * insert/update into the standard `{ error }` result, re-throwing anything
 * else. Centralises the recurring slug+locale conflict catch:
 *
 *   try {
 *     await db.insert(...);
 *   } catch (err) {
 *     return mapAdminUniqueViolation(err, 'A foo with this slug and locale already exists');
 *   }
 */
export function mapAdminUniqueViolation(err: unknown, conflictMessage: string): { error: string } {
  if (extractPgErrorCode(err) === '23505') {
    return { error: conflictMessage };
  }
  throw err;
}
