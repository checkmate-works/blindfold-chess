import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

// Use the same env var priority as drizzle.config.ts
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
    join(import.meta.dirname, '..', 'drizzle', 'custom_access_token_hook.sql'),
    'utf-8'
  );
  await client.unsafe(hookSql);
}

async function main() {
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations complete!');

  if (await isSupabaseEnvironment()) {
    console.log('Supabase environment detected. Applying custom access token hook...');
    await runAuthHook();
    console.log('Auth hook applied!');
  } else {
    console.log('Local environment detected. Skipping auth hook (Supabase-only).');
  }

  await client.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
