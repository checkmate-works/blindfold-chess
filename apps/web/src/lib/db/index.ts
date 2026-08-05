import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { withQueryDeadline } from './query-deadline';
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
const globalForDb = globalThis as unknown as {
  postgresClient: ReturnType<typeof postgres> | undefined;
};

const client =
  globalForDb.postgresClient ??
  postgres(connectionString, {
    prepare: false, // required for Supabase transaction-mode pooler (port 6543)
    max: 10, // postgres.js default, made explicit — shared budget under Fluid Compute
    idle_timeout: 20, // seconds — release idle connections back to the pooler
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

globalForDb.postgresClient = client;

// The deadline wrapper is what actually bounds a query — see its TSDoc for why
// none of the options above can. Applied here rather than to the cached client
// so the wrapper is rebuilt with the module, never persisted across reloads.
export const db = drizzle(withQueryDeadline(client), { schema });

// Re-export schema for convenience
export * from './schema';
export * from './profile-select';
