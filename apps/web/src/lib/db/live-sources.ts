import { type Column, type SQL, and, inArray, isNull } from 'drizzle-orm';

/**
 * Batch-load rows by id, restricted to the ones that are still live.
 *
 * Every surface that turns a stored id back into a link — the coin history,
 * the benefits pages — needs the same two things per source table, and each
 * query used to hand-roll both: the predicate `id IN (…) AND deleted_at IS
 * NULL`, and a short-circuit that skips the round trip when the id list is
 * empty (an `IN ()` over no ids can only match nothing).
 *
 * Hand-rolled, the predicate half is easy to write as a bare `inArray`, which
 * is the regression this centralizes away: a soft-deleted row keeps its id, so
 * it matches, lands in the caller's map, and is rendered as a link — one that
 * 404s, or for a deleted post under a live thread, points at a thread the post
 * is no longer in. Both grant-source lookups behind `/mypage/benefits` shipped
 * that way until 2026-08 while the sibling coin-history lookups filtered
 * correctly.
 *
 * `select` receives the composed predicate and runs the query, so each caller
 * keeps its own projection, joins and table. Its parameter is typed `SQL |
 * undefined` only because drizzle's `and` drops undefined conditions and is
 * therefore typed to return that union; both conditions passed here are always
 * present, and `.where()` takes the union unchanged.
 *
 * `idColumn` need not be a primary key — it is whatever column the ids are
 * matched against (a charge id recorded on the row, say) — and it need not
 * belong to the same table as `deletedAtColumn`, so a query that joins to
 * reach the soft-delete marker works too.
 */
export async function selectLiveByIds<Row>({
  ids,
  idColumn,
  deletedAtColumn,
  select,
}: {
  ids: readonly string[];
  idColumn: Column;
  deletedAtColumn: Column;
  select: (live: SQL | undefined) => Promise<Row[]>;
}): Promise<Row[]> {
  if (ids.length === 0) return [];
  return select(and(inArray(idColumn, ids), isNull(deletedAtColumn)));
}
