/**
 * Schema entry point.
 *
 * The full set of Drizzle table definitions lives in `./tables.ts` — this
 * file is kept monolithic so the exact shape and order of migrations stays
 * stable. Consumers import from this barrel:
 *
 *     import { articles, profiles } from '@/lib/db/schema';
 */
export * from './tables';
