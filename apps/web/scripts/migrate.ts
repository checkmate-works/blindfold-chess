import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import postgres from 'postgres';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    join(__dirname, '..', 'drizzle', 'supabase', 'custom_access_token_hook.sql'),
    'utf-8'
  );
  await client.unsafe(hookSql);
}

async function runProfilesSetup() {
  const profilesSql = readFileSync(
    join(__dirname, '..', 'drizzle', 'supabase', 'profiles_setup.sql'),
    'utf-8'
  );
  await client.unsafe(profilesSql);
}

async function runRlsPolicies() {
  const rlsSql = readFileSync(
    join(__dirname, '..', 'drizzle', 'supabase', 'rls_policies.sql'),
    'utf-8'
  );
  await client.unsafe(rlsSql);
}

async function runStorageAvatars() {
  const avatarsSql = readFileSync(
    join(__dirname, '..', 'drizzle', 'supabase', 'storage_avatars.sql'),
    'utf-8'
  );
  await client.unsafe(avatarsSql);
}

async function runFollowsBlocksSetup() {
  const sql = readFileSync(
    join(__dirname, '..', 'drizzle', 'supabase', 'follows_blocks_setup.sql'),
    'utf-8'
  );
  await client.unsafe(sql);
}

async function runModerationActionsSetup() {
  const sql = readFileSync(
    join(__dirname, '..', 'drizzle', 'supabase', 'moderation_actions_setup.sql'),
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

    console.log('Applying RLS policies...');
    await runRlsPolicies();
    console.log('RLS policies applied!');

    console.log('Applying profiles setup...');
    await runProfilesSetup();
    console.log('Profiles setup applied!');

    console.log('Applying storage avatars setup...');
    await runStorageAvatars();
    console.log('Storage avatars setup applied!');

    console.log('Applying follows & blocks setup...');
    await runFollowsBlocksSetup();
    console.log('Follows & blocks setup applied!');

    console.log('Applying moderation actions setup...');
    await runModerationActionsSetup();
    console.log('Moderation actions setup applied!');
  } else {
    console.log('Local environment detected. Skipping Supabase-only setup.');
  }

  await client.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
