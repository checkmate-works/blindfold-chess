import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

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
const globalForDb = globalThis as unknown as {
  postgresClient: ReturnType<typeof postgres> | undefined;
};

const client =
  globalForDb.postgresClient ??
  postgres(connectionString, {
    prepare: false, // required for Supabase transaction-mode pooler (port 6543)
    idle_timeout: 20, // seconds — release idle connections back to the pooler
    max_lifetime: 60 * 30, // seconds — recycle long-lived connections
  });

globalForDb.postgresClient = client;

export const db = drizzle(client, { schema });

// Re-export schema for convenience
export * from './schema';
export * from './profile-select';
