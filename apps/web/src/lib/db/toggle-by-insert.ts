import { isUniqueViolation } from './extract-pg-error-code';

/**
 * INSERT-first toggle pattern: attempt to insert a row, and if a unique
 * constraint violation is caught, delete the existing row instead.
 *
 * This avoids the race condition of SELECT-then-INSERT by relying on the
 * database constraint to detect duplicates.
 *
 * @returns `true` if the row was inserted, `false` if it was deleted (toggled off).
 */
export async function toggleByInsert(
  insertFn: () => Promise<unknown>,
  deleteFn: () => Promise<unknown>
): Promise<boolean> {
  try {
    await insertFn();
    return true;
  } catch (err: unknown) {
    if (!isUniqueViolation(err)) throw err;
    await deleteFn();
    return false;
  }
}
