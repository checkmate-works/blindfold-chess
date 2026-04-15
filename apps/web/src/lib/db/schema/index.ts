/**
 * Schema entry point.
 *
 * The full set of Drizzle table definitions lives in `./tables.ts` — this
 * file is kept monolithic so the exact shape and order of migrations stays
 * stable. Per-domain re-export modules (`./articles`, `./profiles`, ...)
 * provide focused import surfaces for consumer code:
 *
 *     import { articles } from '@/lib/db/schema/articles';
 *
 * This barrel re-exports everything to preserve the existing public API:
 *
 *     import { articles, profiles } from '@/lib/db/schema';
 */
export * from './tables';
