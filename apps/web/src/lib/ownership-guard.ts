/**
 * Shared "row exists + caller owns it + not soft-deleted" check for
 * owner-only mutations. The same gate was previously implemented three
 * different ways (inline in the position mutations, guardChunkOwnership,
 * assertRepertoireOwner) with divergent return contracts.
 */
export type OwnershipError = 'notFound' | 'unauthorized' | 'alreadyDeleted';

/**
 * Guard a loaded row against the caller.
 *
 * - `row` missing → `'notFound'`
 * - `row.userId` differs (or is null, e.g. orphaned author) → `'unauthorized'`
 * - `row.deletedAt` set → `'alreadyDeleted'`
 *
 * Callers whose fetch already filters out soft-deleted rows can pass a row
 * without `deletedAt`; deleted rows then surface as `'notFound'` (the
 * repertoires convention).
 */
export function guardOwnership(
  row: { userId: string | null; deletedAt?: Date | null } | null | undefined,
  userId: string
): OwnershipError | null {
  if (!row) return 'notFound';
  if (row.userId !== userId) return 'unauthorized';
  if (row.deletedAt) return 'alreadyDeleted';
  return null;
}
