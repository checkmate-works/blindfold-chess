import { type SQL, count } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

import { db } from './index';

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
