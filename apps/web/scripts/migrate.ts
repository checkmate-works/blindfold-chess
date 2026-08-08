import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { readFileSync } from 'fs';
import { setDefaultResultOrder } from 'node:dns';
import { dirname, join } from 'path';
import postgres from 'postgres';
import { fileURLToPath } from 'url';

// Vercel's build containers have no IPv6 route, but the Supabase DB host can
// resolve to an IPv6 address first, failing the migration with ENETUNREACH
// (issue #54). Prefer IPv4 in this process; prebuild-db.ts runs this script
// as a child, so the setting must live here, not in the parent.
setDefaultResultOrder('ipv4first');

dotenv.config({ path: ['.env.local', '.env'] });

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Connection-path policy (issue #94, decided 2026-08).
 *
 * Migrations prefer POSTGRES_URL_NON_POOLING — the Supavisor SESSION pooler
 * (pooler.supabase.com:5432), synced by the Supabase-Vercel integration —
 * over POSTGRES_URL (transaction pooler, 6543). Session mode pins one
 * backend per connection, which is what DDL wants.
 *
 * Deliberately NOT used: Supabase's Direct endpoint. For this project it is
 * IPv6-only and Vercel build containers have no IPv6 route (ENETUNREACH,
 * issue #54). The Dedicated IPv4 add-on (~$4/mo) would fix that, but a
 * migration path fully isolated from app traffic isn't worth paying for
 * while sharing the session pooler works:
 *   - max: 1 below — migrations occupy a single Pool Size slot, so
 *     contention with runtime traffic exists only when the pooler is
 *     completely full.
 *   - Failure is benign: the build fails, the previous deployment keeps
 *     serving, and redeploying is the retry. Drizzle's migration journal
 *     makes reruns idempotent (applied migrations are skipped).
 * Buy the add-on and switch to Direct only if migration-caused build
 * failures are actually observed.
 *
 * Two caveats:
 *   - turbo.json's Strict Environment Mode must keep POSTGRES_URL_NON_POOLING
 *     in the build task's `env` allowlist; dropping it silently falls this
 *     script back to the transaction pooler (that was the state until
 *     2026-08 — see issue #94 for the history).
 *   - CREATE INDEX CONCURRENTLY still cannot run here regardless of the
 *     connection path: the Drizzle migrator wraps migrations in
 *     transactions. Run such statements out-of-band instead.
 */
const connectionString =
  process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.log('No database connection configured. Skipping migration.');
  process.exit(0);
}

// prepare: false is required for Supabase Connection Pooler (Transaction mode / PgBouncer)
// max: 1 to avoid connection pool issues during migration
const client = postgres(connectionString, { prepare: false, max: 1 });
const db = drizzle(client);

async function isSupabaseEnvironment(): Promise<boolean> {
  const result = await client`SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin'`;
  return result.length > 0;
}

async function runAuthHook() {
  const hookSql = readFileSync(
    join(__dirname, '..', 'drizzle', 'supabase', 'custom_access_token_hook.sql'),
    'utf-8'
  );
  await client.unsafe(hookSql);
}

async function runForeignKeysAndGrants() {
  const sql = readFileSync(
    join(__dirname, '..', 'drizzle', 'supabase', 'foreign_keys_and_grants.sql'),
    'utf-8'
  );
  await client.unsafe(sql);
}

async function runRlsPolicies() {
  const rlsSql = readFileSync(
    join(__dirname, '..', 'drizzle', 'supabase', 'rls_policies.sql'),
    'utf-8'
  );
  await client.unsafe(rlsSql);
}

async function runStorageSetup() {
  const sql = readFileSync(
    join(__dirname, '..', 'drizzle', 'supabase', 'storage_setup.sql'),
    'utf-8'
  );
  await client.unsafe(sql);
}

async function runScheduledJobs() {
  const sql = readFileSync(
    join(__dirname, '..', 'drizzle', 'supabase', 'scheduled_jobs.sql'),
    'utf-8'
  );
  await client.unsafe(sql);
}

async function main() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations complete!');

  if (await isSupabaseEnvironment()) {
    console.log('Supabase environment detected. Applying custom access token hook...');
    await runAuthHook();
    console.log('Auth hook applied!');

    console.log('Applying foreign keys and grants...');
    await runForeignKeysAndGrants();
    console.log('Foreign keys and grants applied!');

    console.log('Applying RLS policies...');
    await runRlsPolicies();
    console.log('RLS policies applied!');

    console.log('Applying storage setup...');
    await runStorageSetup();
    console.log('Storage setup applied!');

    console.log('Applying scheduled jobs...');
    await runScheduledJobs();
    console.log('Scheduled jobs applied!');
  } else {
    console.log('Local environment detected. Skipping Supabase-only setup.');
  }

  await client.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
