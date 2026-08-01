// eslint-disable-next-line no-restricted-imports -- AdminDeleteButton deliberately has no router.refresh(); the factory's revalidatePath is the sole re-render path that removes the deleted row from every admin list built on it
import { revalidatePath } from 'next/cache';

import { eq } from 'drizzle-orm';
import type { PgTableWithColumns } from 'drizzle-orm/pg-core';

import type { ActionResult } from '@/lib/action-types';
import { db } from '@/lib/db';
import { extractPgErrorCode } from '@/lib/db/extract-pg-error-code';

import { requireAdmin } from './auth';

export type DeleteResult = ActionResult;
/**
 * Admin create/update outcome. The error branch is {@link AdminMutationError}
 * rather than a bare `{ error }` so a validation rejection can name the input
 * it is about; consumers that only read `.error` are unaffected.
 */
export type MutationResult = { success: true; id: string } | AdminMutationError;

/**
 * A validation rejection that knows which input it is about.
 *
 * The per-feature `validate*Data` functions compose the shared field checks in
 * `_lib/validators.ts`, so they already know which field they were checking
 * when one failed — this carries that knowledge to the form instead of
 * discarding it. Admin forms are among the tallest in the app (a full-height
 * editor with a metadata side panel), where a message stranded at the top says
 * nothing about the input to fix. `field: null` means no input owns it.
 *
 * A validator that has nothing useful to attribute may still return a plain
 * string; the guard accepts both.
 */
export type AdminValidationIssue = { field: string | null; message: string };

/** An error result, carrying the offending input's name when one is known. */
export type AdminMutationError = { error: string; field?: string };

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
  validate: (data: T) => string | AdminValidationIssue | null
): Promise<AdminMutationError | null> {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return auth;
  }

  const validationError = validate(data);
  if (validationError) {
    return typeof validationError === 'string'
      ? { error: validationError }
      : { error: validationError.message, field: validationError.field ?? undefined };
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
