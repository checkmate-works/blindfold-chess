import { type SQL, and, count } from 'drizzle-orm';
import type { PgSelect, PgTable } from 'drizzle-orm/pg-core';

import { db } from './index';

/**
 * AND together an optionally-empty condition list, yielding `undefined` when
 * there is nothing to filter on (the shape `runPaginatedSelect` and drizzle's
 * `.where()` both expect). Centralizes the
 * `conditions.length > 0 ? and(...conditions) : undefined` tail that
 * per-entity condition builders were hand-copying.
 */
export function combineConditions(conditions: SQL[]): SQL | undefined {
  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Apply the standard paginated-list tail to a select builder:
 * optional `WHERE`, then `ORDER BY` + `LIMIT` + `OFFSET`. Centralizes the
 * `(where ? query.where(where) : query).orderBy(...).limit(...).offset(...)`
 * skeleton that domain list queries were hand-copying.
 *
 * The builder must be passed in dynamic mode (`query.$dynamic()`) so the
 * conditional `where` composes type-safely. Per-entity condition and order
 * builders stay local to their modules — only the execution tail is shared.
 */
export function runPaginatedSelect<T extends PgSelect>(
  query: T,
  opts: { where: SQL | undefined; orderBy: SQL[]; limit: number; offset: number }
): T {
  const filtered = opts.where ? query.where(opts.where) : query;
  return filtered
    .orderBy(...opts.orderBy)
    .limit(opts.limit)
    .offset(opts.offset);
}

/**
 * Count rows in a table, optionally filtered. Centralizes the
 * `select({ count: count() })` + `(where ? query.where(where) : query)`
 * + `row?.count ?? 0` skeleton that domain query modules were hand-copying.
 *
 * The projection is aliased `count` rather than `value` to match how every
 * hand-rolled site spelled it — the alias is not observable through this
 * function's number return, but it is what `db.select()` mocks in the callers'
 * tests assert against.
 *
 * Prefer this over hand-rolling: the raw form was written three different ways
 * (`count()`, `` sql`count(*)` ``, `` sql`count(*)::int` ``), and the middle one
 * comes back from pg as a *string*, so a site that forgot `Number(...)` around
 * it silently computed `Math.ceil("41" / 20)`.
 *
 * Not re-exported from the `@/lib/db` barrel — import via
 * `@/lib/db/list-query` (the barrel importing this module would create a
 * require cycle, since this module needs `db` from the barrel's index).
 */
export async function countRows(table: PgTable, where?: SQL): Promise<number> {
  const query = db.select({ count: count() }).from(table);
  const [row] = await (where ? query.where(where) : query);
  return row?.count ?? 0;
}
