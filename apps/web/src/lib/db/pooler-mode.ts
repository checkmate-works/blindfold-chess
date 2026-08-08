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
