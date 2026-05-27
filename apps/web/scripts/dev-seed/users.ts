import type { SupabaseClient } from '@supabase/supabase-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { profiles } from '../../src/lib/db/schema';

export type SeedUser = {
  email: string;
  username: string;
  displayName: string;
};

export const SEED_USERS: SeedUser[] = [
  { email: 'alice@example.local', username: 'seed-alice', displayName: 'Alice (seed)' },
  { email: 'bob@example.local', username: 'seed-bob', displayName: 'Bob (seed)' },
  { email: 'carol@example.local', username: 'seed-carol', displayName: 'Carol (seed)' },
  { email: 'dave@example.local', username: 'seed-dave', displayName: 'Dave (seed)' },
  { email: 'eve@example.local', username: 'seed-eve', displayName: 'Eve (seed)' },
];

const SEED_PASSWORD = 'dev-password';

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

  return userId;
}
