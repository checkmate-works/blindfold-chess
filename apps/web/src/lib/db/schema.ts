/**
 * Backward-compat re-export.
 *
 * The schema has been split into `./schema/` — see `./schema/index.ts` for
 * the new entry point and per-domain modules (`./schema/articles`, etc.).
 * This file exists solely so existing `import ... from '@/lib/db/schema'`
 * sites continue to work unchanged.
 */
export * from './schema/index';
