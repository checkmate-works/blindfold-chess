import type { db } from './';

/**
 * Drizzle transaction client. The handle passed to the callback of
 * `db.transaction(...)`. Use as the type for helper functions that
 * must run inside an existing transaction.
 */
export type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Either a transaction or the base db client. Use when a helper can
 * be called both inside an existing transaction (passing the tx
 * handle) and outside (passing `db` directly).
 */
export type DbTxOrDb = DbTx | typeof db;
