import { vi } from 'vitest';

/**
 * The real Drizzle tables and column helpers, for tests that must mock
 * `@/lib/db` but should not be inventing its schema.
 *
 * `@/lib/db` cannot be imported for real in a unit test: the module builds a
 * postgres client at import time. But its surface is only three things —
 * `db`, `export * from './schema'`, `export * from './profile-select'` — and
 * the last two are side-effect-free table definitions and column lists. So a
 * test needs to replace `db` and nothing else.
 *
 * What it replaced instead was the whole module, which meant hand-writing a
 * stub for every table the code under test touches (`profiles: { id:
 * 'profiles.id' }` and the like). Those stubs were partial by construction —
 * only the columns someone had needed so far — so a SUT reaching for a new
 * column silently got `undefined`, and nothing ever checked any of it against
 * the real schema.
 *
 * Usage:
 *
 * ```ts
 * vi.mock('@/lib/db', async () => ({
 *   ...(await actualDbSchema()),
 *   db: myDbDouble,
 * }));
 * ```
 *
 * One constraint: the test file must NOT also carry a static
 * `import ... from '@/lib/db'`. Import sorting puts it above this module, so
 * it runs the hoisted factory before this module's binding exists, and the
 * suite dies with `Cannot access '__vi_import_N__' before initialization`
 * rather than a failed assertion. Reach for `const { db } = await
 * import('@/lib/db')` below the factory instead — the same shape these tests
 * already use for the subject under test.
 */
export async function actualDbSchema(): Promise<Record<string, unknown>> {
  return {
    ...(await vi.importActual<Record<string, unknown>>('@/lib/db/schema')),
    ...(await vi.importActual<Record<string, unknown>>('@/lib/db/profile-select')),
  };
}
