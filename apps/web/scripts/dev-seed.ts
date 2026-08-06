/**
 * Local-only dev seed.
 *
 * Populates auth users, profiles, challenge_results / challenge_best_scores, and
 * belt ranks with predictable test data so the practice leaderboards have
 * entries — and so rank conditions can be exercised from a known rung — during
 * local development. Refuses to run against any non-local DB or Supabase URL
 * (host check) — the master-data seed (`pnpm db:seed`) remains the prod path.
 *
 * Run `pnpm db:seed` first: the rank grants look up `ranks` by slug.
 *
 * Required env in apps/web/.env.local:
 *   - NEXT_PUBLIC_SUPABASE_URL  (defaults to http://127.0.0.1:54321 if unset)
 *   - SUPABASE_SERVICE_ROLE_KEY (from `supabase status -o json`)
 *   - DATABASE_URL / POSTGRES_URL (defaults to local Supabase Postgres)
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { reseedChallenges } from './dev-seed/challenges';
import { grantRanksUpTo } from './dev-seed/ranks';
import { SEED_PASSWORD, SEED_USERS, ensureSeedUser } from './dev-seed/users';

dotenv.config({ path: ['.env.local', '.env'] });

const dbUrl =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error(
    'dev-seed: SUPABASE_SERVICE_ROLE_KEY is required.\n' +
      '          Add it to apps/web/.env.local using the SECRET_KEY value\n' +
      '          from `supabase status -o json`.'
  );
  process.exit(1);
}

function tryHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '<invalid>';
  }
}

function isLocalUrl(url: string): boolean {
  const host = tryHost(url);
  return host === '127.0.0.1' || host === 'localhost';
}

if (!isLocalUrl(dbUrl) || !isLocalUrl(supabaseUrl)) {
  console.error('dev-seed: refusing to run against a non-local environment.');
  console.error(`          DB URL host:       ${tryHost(dbUrl)}`);
  console.error(`          Supabase URL host: ${tryHost(supabaseUrl)}`);
  process.exit(1);
}

const client = postgres(dbUrl, { prepare: false, max: 1 });
const db = drizzle(client);
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('dev-seed: ensuring seed users...');
  const userIds: string[] = [];
  for (const u of SEED_USERS) {
    const id = await ensureSeedUser(admin, db, u);
    userIds.push(id);
    console.log(`  ${u.username.padEnd(12)} → ${id}${u.isAdmin ? ' (admin role granted)' : ''}`);
  }

  const adminUser = SEED_USERS.find((u) => u.isAdmin);
  if (adminUser) {
    console.log(`  /admin: sign in as ${adminUser.email} / ${SEED_PASSWORD}`);
  }

  console.log('dev-seed: reseeding challenge data...');
  const inserted = await reseedChallenges(db, userIds);
  console.log(`  inserted ${inserted} challenge_results rows + matching best_scores`);

  console.log('dev-seed: granting belt ranks...');
  for (const [index, u] of SEED_USERS.entries()) {
    if (!u.rankUpTo) continue;
    const granted = await grantRanksUpTo(db, userIds[index], u.rankUpTo);
    console.log(`  ${u.username.padEnd(12)} → ${granted.join(', ')}`);
    console.log(`  ${''.padEnd(12)}   sign in as ${u.email} / ${SEED_PASSWORD}`);
  }
}

main()
  .then(() => client.end())
  .then(() => console.log('dev-seed: done.'))
  .catch(async (err) => {
    console.error('dev-seed failed:', err);
    await client.end({ timeout: 1 });
    process.exit(1);
  });
