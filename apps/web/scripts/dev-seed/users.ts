import type { SupabaseClient } from '@supabase/supabase-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { profiles, userRoles } from '../../src/lib/db/schema';

export type SeedUser = {
  email: string;
  username: string;
  displayName: string;
  /**
   * Grant every rank up to this slug, bypassing the conditions.
   *
   * NOT a prerequisite for testing higher ranks: `checkAndGrantRanks` evaluates
   * every unachieved rank independently, so a rank-less user can be promoted
   * straight to 1kyu/1dan by one qualifying game. What this gives instead is a
   * user with a known, non-empty achievement history — the state everything
   * that reads `user_ranks` (next-rank recommendation, the ranks grid, rank-up
   * notifications, dan-tier ad-free) needs in order to be exercised at all.
   */
  rankUpTo?: string;
  /**
   * Insert an `admin` row in `user_roles` for this user.
   *
   * The admin panel authorises off that table directly (see
   * `admin/layout.tsx`), so seeding the row is all a local `/admin` session
   * needs — the Custom Access Token Hook only matters for RLS in a deployed
   * Supabase project. Safe to automate because this script refuses to run
   * against anything but a localhost DB + Supabase URL.
   */
  isAdmin?: boolean;
};

export const SEED_USERS: SeedUser[] = [
  // Admin panel account. Kept separate from the players below so the 404-for
  // non-admins path stays testable with a normal seed user in the same run.
  {
    email: 'admin@example.local',
    username: 'seed-admin',
    displayName: 'Admin (seed)',
    isAdmin: true,
  },
  // Holds 5kyu through 2kyu, so the recommended next rank is 1kyu and one
  // published won game promotes them to exactly that (a blindfold-constrained
  // win would additionally jump them to 1dan — skip-grants are allowed).
  {
    email: 'alice@example.local',
    username: 'seed-alice',
    displayName: 'Alice (seed)',
    rankUpTo: '2kyu',
  },
  { email: 'bob@example.local', username: 'seed-bob', displayName: 'Bob (seed)' },
  { email: 'carol@example.local', username: 'seed-carol', displayName: 'Carol (seed)' },
  { email: 'dave@example.local', username: 'seed-dave', displayName: 'Dave (seed)' },
  { email: 'eve@example.local', username: 'seed-eve', displayName: 'Eve (seed)' },
];

export const SEED_PASSWORD = 'dev-password';

/**
 * Idempotently create an auth user + profile pair. The auth_hook in this
 * project deliberately disables the auto-profile trigger ("moved to app
 * layer"; see drizzle/supabase/foreign_keys_and_grants.sql), so the script
 * mirrors the app's signup path: createUser → insert profile.
 */
export async function ensureSeedUser(
  admin: SupabaseClient,
  db: PostgresJsDatabase,
  u: SeedUser
): Promise<string> {
  // Supabase JS has no getUserByEmail admin endpoint; listUsers is the
  // canonical way to check existence. perPage: 1000 is the server-enforced
  // upper bound, and local seed sets stay well below it.
  const list = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (list.error) throw list.error;
  const existing = list.data.users.find((x) => x.email === u.email);

  let userId: string;
  if (existing) {
    userId = existing.id;
  } else {
    const created = await admin.auth.admin.createUser({
      email: u.email,
      password: SEED_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: u.displayName },
    });
    if (created.error) throw created.error;
    if (!created.data.user) throw new Error(`createUser returned no user for ${u.email}`);
    userId = created.data.user.id;
  }

  await db
    .insert(profiles)
    .values({
      id: userId,
      username: u.username,
      displayName: u.displayName,
    })
    .onConflictDoNothing();

  if (u.isAdmin) {
    await db.insert(userRoles).values({ userId, role: 'admin' }).onConflictDoNothing();
  }

  return userId;
}
