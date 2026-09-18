/**
 * How the app's connection string reaches Postgres. Derived from the URL so
 * every Sentry event can carry it as a tag (`db.pooler_mode`): connection-level
 * failures differ sharply between modes (see `USE_SESSION_POOLER` in
 * `./index.ts`), and a tag derived at the pool module beats reconstructing
 * which deploy used which URL.
 *
 * - `transaction` — Supavisor transaction mode (port 6543): a backend is
 *   assigned per statement. The mode under which queries were being swallowed.
 * - `session` — Supavisor session mode (pooler host, port 5432): a backend is
 *   pinned to the client connection for its lifetime, bypassing per-statement
 *   backend assignment.
 * - `direct` — no pooler in the path (db.<ref>.supabase.co or any non-pooler
 *   remote host).
 * - `local` — loopback development database.
 * - `unknown` — the URL did not parse; the pool will fail on its own terms.
 */
export type PoolerMode = 'transaction' | 'session' | 'direct' | 'local' | 'unknown';

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

export function derivePoolerMode(connectionString: string): PoolerMode {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return 'unknown';
  }
  if (LOCAL_HOSTS.has(url.hostname)) return 'local';
  if (url.port === '6543') return 'transaction';
  if (url.hostname.includes('pooler.')) return 'session';
  return 'direct';
}

/**
 * Port of the local Supavisor session pooler, from `[db.pooler] port` in
 * `apps/web/supabase/config.toml`. Not derivable from `PoolerMode` alone:
 * `derivePoolerMode` tags any loopback host `'local'` before looking at the
 * port, so `'local'` covers both the pooler (54329) and the direct
 * `[db]` connection (54322, `port` in the same file).
 */
const LOCAL_SUPAVISOR_POOLER_PORT = '54329';

/**
 * Per-process connection cap for the postgres.js pool.
 *
 * ## Runtime (`isBuildPhase: false`)
 *
 * Session mode halves the cap because each connection pins a Postgres backend
 * for its lifetime and the pooler's "Pool Size" is shared across ALL
 * concurrently-warm Fluid Compute instances — raise the dashboard budget
 * before raising the 5. This axis scales with traffic (more concurrent
 * requests → more warm instances × max each) and is a capacity-planning
 * problem, not a code one.
 *
 * `'local'` gets the same 5 when the connection's port is the local
 * Supavisor pooler's (54329, see `LOCAL_SUPAVISOR_POOLER_PORT`): since
 * 2026-08-08 local development runs through that pooler in session mode too,
 * and sizing it like production lets local reproduce production's budget
 * arithmetic instead of silently running twice the per-instance connection
 * pressure. A `'local'` connection on the direct port (54322) still gets 10 —
 * no pooler is in the path there, so nothing to mirror. `derivePoolerMode`'s
 * return value and the `db.pooler_mode` Sentry tag are unaffected; this is a
 * sizing-only distinction.
 *
 * ## Build (`isBuildPhase: true`) — clamp to 2
 *
 * `next build` is a different, traffic-independent axis: static export runs
 * in (CPU cores − 1) worker processes, each of which instantiates this module
 * and therefore its own pool. Nothing bounds (workers × max) against the
 * shared connection ceiling, and the demand only materialises when the
 * persisted Data Cache (`.next/cache/fetch-cache`) is empty — then every
 * `unstable_cache`-backed page misses at once across all workers.
 *
 * Reproduced locally on 2026-08-11 (8 cores → 7 workers, local Supabase,
 * direct 127.0.0.1:54322): a Data-Cache-cold build's pools grew to exactly
 * the available headroom — `max_connections 100` − `superuser_reserved 3` −
 * ~51 baseline connections (25 of them the local Supavisor's own tenant
 * pool) = 46 — then failed the export with SQLSTATE 53300. The same build
 * with a warm Data Cache exported all 1241 pages holding 3 connections.
 * Unclamped worst case is workers × 10, i.e. it grows with core count.
 *
 * The clamp also protects production: Vercel build workers hit the SAME
 * session-pooler Pool Size that live traffic is using, shielded only by the
 * Data Cache surviving across deploys. On a cache-cold deploy, an unclamped
 * build stampede would compete with real users for backends. 2 per worker
 * keeps even a 16-core builder at ≤30 connections while costing only
 * intra-worker queueing of millisecond-scale queries.
 *
 * (Distinct from the 2026-07 "connection black hole" incident — that was the
 * transaction pooler swallowing queries, a mode problem, not exhaustion.)
 */
export function resolvePoolMax(
  poolerMode: PoolerMode,
  isBuildPhase: boolean,
  port?: string
): number {
  if (isBuildPhase) return 2;
  if (poolerMode === 'session') return 5;
  if (poolerMode === 'local' && port === LOCAL_SUPAVISOR_POOLER_PORT) return 5;
  return 10;
}

/**
 * Extracts the port from a connection string for `resolvePoolMax`'s local/
 * pooler-port check. Returns `undefined` on an unparseable string, matching
 * `derivePoolerMode`'s own fallback — the caller already has `poolerMode`
 * from that function to decide whether the port matters.
 */
export function parseConnectionPort(connectionString: string): string | undefined {
  try {
    return new URL(connectionString).port || undefined;
  } catch {
    return undefined;
  }
}
