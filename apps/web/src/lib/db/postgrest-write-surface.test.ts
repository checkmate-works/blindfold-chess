/**
 * Guard on what the PostgREST surface lets a logged-in client write.
 *
 * Why this test exists at all
 * ---------------------------
 * The app never reads or writes a table through the Supabase JS client — that
 * client is used only for `auth` and `storage`. Every table read and write goes
 * through Drizzle on a BYPASSRLS connection, so RLS policies never run for
 * application traffic. What they DO govern is the parallel, always-open door:
 * `public` is exposed to PostgREST and the anon key ships in the browser bundle,
 * so any signed-in user can send `PATCH /rest/v1/<table>` with their own JWT and
 * get whatever `authenticated` has been granted.
 *
 * That makes a write grant to `authenticated` a second, unguarded entry point to
 * the same rows the Server Actions guard — one with no validation, no rate
 * limiting, no coin ledger, and no moderation checks. The tables below therefore
 * grant `authenticated` reads (and, where users genuinely create rows, INSERT)
 * but never UPDATE, because RLS can express "your own row" and cannot express
 * "your own row, except the `deleted_at` column an admin set". Without that
 * distinction an author could clear `deleted_at` over PostgREST and restore
 * content a moderator had removed, leaving no audit trail for the restore.
 *
 * Why it is a static test and not an integration test
 * ---------------------------------------------------
 * A privilege regression is introduced by editing SQL, and these two files are
 * re-applied verbatim on every deploy (`scripts/migrate.ts`). Parsing them is
 * therefore an exact check on what production will be told to do, and it runs
 * without a database. An integration test would additionally prove the live DB
 * matches, but only for whichever database the test happened to point at.
 *
 * Note on REVOKE: `GRANT` is additive and this SQL re-runs against a database
 * that earlier deploys already granted, so *narrowing* a `GRANT` statement does
 * not withdraw the privilege. Removing one requires an explicit `REVOKE`, and
 * this test models both so it fails if a `REVOKE` line is dropped.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const SUPABASE_SQL_DIR = join(__dirname, '..', '..', '..', 'drizzle', 'supabase');

const grantsSql = readFileSync(join(SUPABASE_SQL_DIR, 'foreign_keys_and_grants.sql'), 'utf-8');
const rlsSql = readFileSync(join(SUPABASE_SQL_DIR, 'rls_policies.sql'), 'utf-8');

type Privilege = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';

const ALL_PRIVILEGES: readonly Privilege[] = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];

/**
 * Replay every GRANT / REVOKE in file order and return the privileges `role`
 * ends up holding on `public.<table>`. `ALL` expands to the four table
 * privileges this schema actually uses (TRUNCATE / REFERENCES / TRIGGER are
 * never granted to client roles, so ignoring them cannot mask a finding).
 */
function effectivePrivileges(sql: string, table: string, role: string): Set<Privilege> {
  const held = new Set<Privilege>();
  const statement = new RegExp(
    `^\\s*(GRANT|REVOKE)\\s+(.+?)\\s+ON\\s+TABLE\\s+public\\.${table}\\s+(?:TO|FROM)\\s+([^;]+);`,
    'gim'
  );

  for (const [, verb, privList, roleList] of sql.matchAll(statement)) {
    const roles = roleList.split(',').map((r) => r.trim());
    if (!roles.includes(role)) continue;

    const privileges = /\ball\b/i.test(privList)
      ? ALL_PRIVILEGES
      : ALL_PRIVILEGES.filter((p) => new RegExp(`\\b${p}\\b`, 'i').test(privList));

    for (const privilege of privileges) {
      if (verb.toUpperCase() === 'GRANT') held.add(privilege);
      else held.delete(privilege);
    }
  }

  return held;
}

/** Policy names declared via CREATE POLICY, i.e. actually in force. */
function createdPoliciesFor(table: string): string[] {
  const created = rlsSql.matchAll(
    new RegExp(`^\\s*CREATE\\s+POLICY\\s+"([^"]+)"\\s+ON\\s+"${table}"\\s+([\\s\\S]*?);`, 'gim')
  );
  return [...created].map(([, name]) => name);
}

/** The commands (`FOR <cmd>`) that `table` has a live policy for. */
function policyCommandsFor(table: string): Set<string> {
  const commands = new Set<string>();
  const created = rlsSql.matchAll(
    new RegExp(`^\\s*CREATE\\s+POLICY\\s+"[^"]+"\\s+ON\\s+"${table}"\\s+([\\s\\S]*?);`, 'gim')
  );
  for (const [, body] of created) {
    const forClause = body.match(/\bFOR\s+(SELECT|INSERT|UPDATE|DELETE|ALL)\b/i);
    commands.add(forClause ? forClause[1].toUpperCase() : 'ALL');
  }
  return commands;
}

/**
 * Tables where a client may create its own row but must never update one,
 * because "your own row" (all RLS can say) is not "your own row except the
 * columns an admin or the system owns" (what is actually required).
 */
const OWNER_INSERT_NEVER_UPDATE = [
  // A moderator soft-deletes via `deleted_at`; the author must not clear it.
  'topic_posts',
  'positions',
  'chunks',
  // `username` (ban-evasion hold), `banned_at`, `deleted_at` and
  // `hidden_from_leaderboard` are not the user's to set.
  'profiles',
] as const;

/**
 * Tables that are publicly readable but must be written only by the service
 * role, because the thing RLS can check (does this row name me?) is not the
 * thing that matters (is what this row asserts true?).
 */
const READ_ONLY_FOR_AUTHENTICATED = [
  // Self-reported achievement: feeds the public leaderboards, the
  // `challenge_score` belt-rank requirement, and the monthly badge cron.
  'challenge_results',
  'challenge_best_scores',
  // Public timeline: the payload columns (`entity_type` / `entity_id` /
  // `metadata` / `created_at`) are what a forger controls, and RLS cannot
  // constrain them.
  'feed_items',
] as const;

describe('PostgREST write surface for `authenticated`', () => {
  describe.each(OWNER_INSERT_NEVER_UPDATE)('%s', (table) => {
    it('does not grant UPDATE (a column-blind RLS policy cannot protect `deleted_at`)', () => {
      expect(effectivePrivileges(grantsSql, table, 'authenticated')).not.toContain('UPDATE');
    });

    it('has no UPDATE policy, so a re-added grant fails closed instead of open', () => {
      expect(policyCommandsFor(table)).not.toContain('UPDATE');
      expect(createdPoliciesFor(table)).not.toContain(`${table}_update`);
      expect(createdPoliciesFor(table)).not.toContain(`${table}_update_policy`);
    });

    it('still allows public reads (these rows are public by design)', () => {
      expect(effectivePrivileges(grantsSql, table, 'anon')).toContain('SELECT');
    });
  });

  describe.each(READ_ONLY_FOR_AUTHENTICATED)('%s', (table) => {
    it('grants SELECT and nothing else', () => {
      expect([...effectivePrivileges(grantsSql, table, 'authenticated')]).toEqual(['SELECT']);
    });

    it('has no write policy at all, so a re-added grant fails closed', () => {
      const commands = policyCommandsFor(table);
      for (const write of ['INSERT', 'UPDATE', 'DELETE', 'ALL']) {
        expect(commands, `${table} must have no ${write} policy`).not.toContain(write);
      }
    });
  });

  it('never grants a write privilege to `anon`', () => {
    const tables = [...grantsSql.matchAll(/ON\s+TABLE\s+public\.(\w+)/gi)].map(([, t]) => t);
    for (const table of new Set(tables)) {
      const anonPrivileges = effectivePrivileges(grantsSql, table, 'anon');
      for (const write of ['INSERT', 'UPDATE', 'DELETE'] as const) {
        expect(anonPrivileges, `anon must not hold ${write} on ${table}`).not.toContain(write);
      }
    }
  });
});
