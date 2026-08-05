import * as Sentry from '@sentry/nextjs';
import { waitUntil } from '@vercel/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres';
import postgres from 'postgres';

import {
  type DeadlineRetry,
  setDeadlineRetry,
  setQueryActivityHandler,
  setWedgedQueryHandler,
  withQueryDeadline,
} from './query-deadline';
import * as schema from './schema';

// POSTGRES_URL: Set by Vercel Marketplace Supabase integration
// DATABASE_URL: For manual configuration
// Default: Supabase local PostgreSQL for development
const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

// Reuse the same postgres client across reloads/invocations.
// - In development: avoids a new pool per HMR hot-reload (would exhaust
//   PostgreSQL's max_connections, error 53300).
// - In production on Vercel Fluid Compute: a warm instance serves many
//   concurrent requests, so the pool MUST be defined globally and reused
//   across invocations. Per Vercel's connection-pooling guidance we also
//   set a low idle_timeout so connections accumulated under a traffic burst
//   are released quickly, instead of piling up against Supabase's pooler
//   client limit (the EMAXCONN "max client connections reached, limit: 200").
//   Note: max:1 is intentionally NOT used — under Fluid Compute it does not
//   reduce total connections and serializes concurrent requests.
//
// The timeouts below exist so a wedged query fails loudly instead of silently.
// A server render that awaits a query with no deadline holds its RSC stream
// open until the platform kills the function (300s under Fluid Compute), which
// the user sees as a navigation whose skeleton never resolves — see the
// navigation-stall entry in CLAUDE.md's Known Issues. Every value here is
// chosen to fail fast enough that the failure lands in Sentry with a cause
// attached, while staying far above any legitimate query.
//
// None of these options can bound a query that has already been dispatched:
// `statement_timeout` is server-side and only starts once the backend begins
// executing, `connect_timeout` covers the connect phase, and postgres.js has
// no timeout on acquiring a pooled connection either. `withQueryDeadline`
// below is what closes that gap — see its TSDoc.
/**
 * Seconds a pooled connection may sit idle before postgres.js closes it.
 * Extracted because the pool-drain keepalive below must outlast it.
 */
const IDLE_TIMEOUT_SECONDS = 20;

function createPooledClient(): ReturnType<typeof postgres> {
  return postgres(connectionString, {
    prepare: false, // required for Supabase transaction-mode pooler (port 6543)
    max: 10, // postgres.js default, made explicit — shared budget under Fluid Compute
    idle_timeout: IDLE_TIMEOUT_SECONDS, // release idle connections back to the pooler
    max_lifetime: 60 * 30, // seconds — recycle long-lived connections
    connect_timeout: 10, // seconds — fail fast instead of the 30s default
    // seconds. Lowered from the 60s default so the OS surfaces a half-open
    // socket well before the platform's 60s maxDuration would kill the render
    // that is waiting on it — at 60s the two coincide and keepalive never gets
    // to report anything.
    keep_alive: 15,
    // Sent as a startup parameter. Caps server-side query execution so a
    // wedged query errors out (SQLSTATE 57014) instead of holding an RSC
    // stream open until the platform's maxDuration kill.
    //
    // Production points at Supabase's transaction-mode pooler (Supavisor),
    // and forwarding of this startup parameter is CONFIRMED: a 57014
    // ("canceling statement due to statement timeout") reached Sentry on
    // 2026-08-05 from the admin dashboard's topic_posts aggregation
    // (issue #107). No fallback via `ALTER DATABASE` is needed.
    connection: {
      statement_timeout: 30_000, // milliseconds — a bare number is what Postgres reads this unit as
    },
  });
}

const globalForDb = globalThis as unknown as {
  postgresClient: ReturnType<typeof postgres> | undefined;
};

let activeClient = globalForDb.postgresClient ?? createPooledClient();
globalForDb.postgresClient = activeClient;

// The deadline wrapper is what actually bounds a query — see its TSDoc for why
// none of the options above can. Applied here rather than to the cached client
// so the wrapper is rebuilt with the module, never persisted across reloads.
let activeWrapped = withQueryDeadline(activeClient);

/**
 * @design Self-healing pool: rebuild when a query wedges
 *
 * On Fluid Compute an instance is frozen between requests. While frozen, the
 * pool's sockets can silently lose their path (no RST arrives, so the client
 * cannot tell), and postgres.js's own idle reaper cannot run because its
 * timers are frozen with the process. The first query dispatched on such a
 * socket after thaw never settles: production on 2026-08-05 showed five of
 * them accumulated on one instance, the oldest 702 seconds — held until TCP
 * itself gave up — each occupying one of the `max: 10` pool slots. Enough of
 * those and the instance can no longer reach the database at all, which is
 * the "skeleton forever" navigation stall.
 *
 * The wedge handler (see `setWedgedQueryHandler` in `./query-deadline`) fires
 * when a deadlined query stays unsettled past a grace period. Response:
 * retire the whole pool and start a fresh one. Healthy in-flight queries get
 * five seconds to finish before the retired pool's sockets are destroyed;
 * destruction also rejects the wedged queries, which finally frees their
 * awaiters' resources. The debounce keeps a burst of wedges (several stale
 * sockets burned by one render) from rebuilding the pool once per victim.
 *
 * Each rebuild is a Sentry warning (`db-pool-rebuilt`) — frequent occurrences
 * mean the staleness source needs attacking, not just the symptom.
 */
const REBUILD_MIN_INTERVAL_MS = 30_000;
let lastRebuildAt = 0;

/**
 * Retire the current pool and start a fresh one, at most once per debounce
 * window. Shared by the wedge handler and the deadline retry below — the
 * debounce is what keeps the two from double-rebuilding over one incident
 * (the retry rebuilds at deadline+0s; the same query's wedge check fires at
 * deadline+5s and must then be a no-op).
 */
function rebuildPool(reason: string, detail: string): boolean {
  const now = Date.now();
  if (now - lastRebuildAt < REBUILD_MIN_INTERVAL_MS) return false;
  lastRebuildAt = now;

  const retired = activeClient;
  activeClient = createPooledClient();
  globalForDb.postgresClient = activeClient;
  activeWrapped = withQueryDeadline(activeClient);
  retired.end({ timeout: 5 }).catch(() => {
    // The sockets being torn down are the broken ones; errors here are noise.
  });

  console.error(`[db] pool rebuilt (${reason}): ${detail}`);
  Sentry.captureMessage('db-pool-rebuilt', {
    level: 'warning',
    tags: { 'db_pool.rebuild_reason': reason },
    extra: { 'db_pool.rebuild_detail': detail },
  });
  return true;
}

setWedgedQueryHandler(({ sql, ageMs }) => {
  rebuildPool('wedged-query', `wedged for ${ageMs}ms: ${sql}`);
});

/**
 * @design Transparent SELECT retry: a second chance on a fresh connection
 *
 * Production (2026-08-05, issue BLINDFOLD-CHESS-4K) showed sub-millisecond
 * SELECTs going silent for 15s+ on established connections, on instances
 * that had never been frozen (event-loop max delay under 500ms) — the
 * connection path itself intermittently black-holes a query. The deadline
 * turns that into a failed render; this retry turns it into a slow one.
 *
 * On a SELECT deadline, `./query-deadline` asks this dispatcher for a second
 * attempt: retire the suspect pool (debounced — if another victim already
 * rebuilt, the current pool is already fresh) and re-issue the statement on
 * the CURRENT pool. Reads are safe to re-run; writes never take this path
 * (see RETRYABLE_SQL there). Outcomes surface as `db-deadline-retry` —
 * `rescued` means a user saw a slow page instead of an error page.
 */
setDeadlineRetry({
  dispatch: (unsafeArgs) => {
    rebuildPool('deadline-retry', `retrying: ${String(unsafeArgs[0]).slice(0, 300)}`);
    const unsafe = activeClient.unsafe as (...a: unknown[]) => unknown;
    return unsafe(...unsafeArgs) as ReturnType<DeadlineRetry['dispatch']>;
  },
  report: (outcome, sql, retryMs) => {
    console.error(`[db] deadline retry ${outcome} in ${retryMs}ms: ${sql}`);
    Sentry.captureMessage('db-deadline-retry', {
      level: outcome === 'rescued' ? 'info' : 'warning',
      tags: { 'db_retry.outcome': outcome, 'db_retry.ms': String(retryMs) },
      extra: { 'db_retry.sql': sql },
    });
  },
});

/**
 * @design Pool-drain keepalive: hold the instance awake until the pool is empty
 *
 * The wedges handled above exist because Fluid Compute suspends the instance
 * the moment no request is active, freezing postgres.js's idle-reaper timers
 * with it: connections that would have been closed `idle_timeout` seconds
 * after going idle instead sleep inside the frozen process, silently lose
 * their network path (no RST reaches a frozen process), and wedge the first
 * post-thaw query dispatched on them. The rebuild above cures that symptom;
 * this block removes its cause by making sure the instance is never suspended
 * while the pool still holds connections.
 *
 * Vercel's own remedy for this exact failure class is `attachDatabasePool`
 * from `@vercel/functions` — but its duck-typing recognises pg/mysql/mongo/
 * redis pool shapes only and THROWS `Unsupported database pool type` for a
 * postgres.js client (verified against @vercel/functions 3.7.7 source), so
 * this reimplements the same mechanism on the public `waitUntil` API: every
 * query dispatch or settlement (re)arms a keepalive promise that resolves
 * once the pool has been quiet for the idle timeout plus a margin. By then
 * the reaper has closed every idle connection on a live event loop, and the
 * instance suspends with an empty pool — nothing left to go stale.
 *
 * Arming on dispatch (not just settlement) matters for two windows the
 * settle-side arm cannot cover: a query in flight for a render whose client
 * already disconnected can no longer be frozen mid-flight, and a wedged
 * query's deadline-plus-grace sequence (10s + 5s, see ./query-deadline) now
 * always runs on a live instance, so the pool rebuild fires promptly instead
 * of on the next thaw (production 2026-08-05: a 5s grace timer fired 11.6s
 * after its deadline because the instance froze in between).
 *
 * Outside Vercel (local dev, tests, `next build` prerendering) `waitUntil`
 * is a no-op because no request context exists; the timer is unref'd so it
 * never holds a dev server or test runner open.
 */
const POOL_DRAIN_KEEPALIVE_MS = IDLE_TIMEOUT_SECONDS * 1000 + 500;

let drainTimer: ReturnType<typeof setTimeout> | undefined;
let resolveDrained: (() => void) | undefined;

setQueryActivityHandler(() => {
  if (drainTimer) clearTimeout(drainTimer);
  // Settle the previous promise and register a fresh one so the keepalive is
  // anchored to the newest request's context — the same per-event re-arm
  // attachDatabasePool performs for the pools it supports.
  resolveDrained?.();
  const drained = new Promise<void>((resolve) => {
    resolveDrained = resolve;
  });
  waitUntil(drained);
  drainTimer = setTimeout(() => {
    drainTimer = undefined;
    resolveDrained?.();
    resolveDrained = undefined;
  }, POOL_DRAIN_KEEPALIVE_MS);
  // Node-only API, typed loosely because this file compiles under the DOM lib
  // too. Without it a pending keepalive would hold local processes open.
  (drainTimer as { unref?: () => void }).unref?.();
});

/**
 * Stable identity over the swappable client, so the Drizzle instance created
 * once below always reaches the CURRENT pool. Function calls and property
 * reads both delegate; `withQueryDeadline`'s own proxy already returns
 * methods bound to the live client, so no extra binding is needed here.
 */
const clientFacade = new Proxy((() => {}) as unknown as Sql, {
  apply(_target, thisArg, args) {
    return Reflect.apply(activeWrapped as unknown as (...a: unknown[]) => unknown, thisArg, args);
  },
  get(_target, property) {
    return Reflect.get(activeWrapped as object, property);
  },
  has(_target, property) {
    return property in (activeWrapped as object);
  },
});

export const db = drizzle(clientFacade, { schema });

// Re-export schema for convenience
export * from './schema';
export * from './profile-select';
