import { type SQL, count } from 'drizzle-orm';
import type { PgSelect, PgTable } from 'drizzle-orm/pg-core';

import { db } from './index';

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
 * `select({ value: count() })` + `(where ? query.where(where) : query)`
 * + `row?.value ?? 0` skeleton that domain query modules were hand-copying.
 *
 * Not re-exported from the `@/lib/db` barrel — import via
 * `@/lib/db/list-query` (the barrel importing this module would create a
 * require cycle, since this module needs `db` from the barrel's index).
 */
export async function countRows(table: PgTable, where?: SQL): Promise<number> {
  const query = db.select({ value: count() }).from(table);
  const [row] = await (where ? query.where(where) : query);
  return row?.value ?? 0;
}
