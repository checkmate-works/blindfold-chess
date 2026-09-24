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
 * That makes any write grant to `authenticated` a second, unguarded entry point
 * to the same rows the Server Actions guard — one with no validation, no rate
 * limiting, no coin ledger, and no ban, block or moderation checks. RLS cannot
 * close it: a policy can express "your own row", not "a row the Server Action
 * would have accepted". An owner-scoped UPDATE let an author clear `deleted_at`
 * and restore content a moderator had removed; an owner-scoped INSERT on
 * `profiles` let a user without a profile create one with a reserved or
 * malformed username. So client roles get reads only, on every table, and no
 * write policy exists for a re-added grant to fall through to.
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

/** Tables that appear in rls_policies.sql via ALTER TABLE ... ENABLE ROW LEVEL SECURITY. */
function tablesWithRlsEnabled(): Set<string> {
  const tables = new Set<string>();
  for (const [, table] of rlsSql.matchAll(
    /ALTER\s+TABLE\s+"([^"]+)"\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi
  )) {
    tables.add(table);
  }
  return tables;
}

/** Tables that appear in foreign_keys_and_grants.sql via GRANT or REVOKE. */
function tablesWithGrantsOrRevokes(): Set<string> {
  const tables = new Set<string>();
  for (const [, table] of grantsSql.matchAll(
    /(?:GRANT|REVOKE)\s+[\s\S]*?\s+(?:ON|TO|FROM)\s+TABLE\s+public\.(\w+)/gi
  )) {
    tables.add(table);
  }
  return tables;
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

const WRITE_PRIVILEGES = ['INSERT', 'UPDATE', 'DELETE'] as const;

/** Every table any GRANT or REVOKE in foreign_keys_and_grants.sql names. */
const GRANTED_TABLES = [...tablesWithGrantsOrRevokes()];

/** Every table rls_policies.sql creates at least one policy on. */
const TABLES_WITH_POLICIES = [
  ...new Set(
    [...rlsSql.matchAll(/^\s*CREATE\s+POLICY\s+"[^"]+"\s+ON\s+"([^"]+)"/gim)].map(([, t]) => t)
  ),
];

/** The last `;`-terminated statement of `sql`, comments stripped. */
function lastStatement(sql: string): string {
  const statements = sql
    .replace(/--[^\n]*/g, '')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
  return statements[statements.length - 1];
}

describe('PostgREST write surface for client roles', () => {
  it.each(GRANTED_TABLES)('%s: `authenticated` is granted no write privilege', (table) => {
    const held = effectivePrivileges(grantsSql, table, 'authenticated');
    for (const write of WRITE_PRIVILEGES) {
      expect(held, `authenticated must not hold ${write} on ${table}`).not.toContain(write);
    }
  });

  it.each(TABLES_WITH_POLICIES)(
    '%s: has no write policy, so a re-added grant fails closed',
    (table) => {
      const commands = policyCommandsFor(table);
      for (const write of [...WRITE_PRIVILEGES, 'ALL']) {
        expect(commands, `${table} must have no ${write} policy`).not.toContain(write);
      }
    }
  );

  // The per-table GRANTs above only say what is granted; this is what withdraws
  // everything else — privileges earlier deploys handed out and the wide
  // defaults an old database was initialised with, including on tables no
  // GRANT names. It must run after every GRANT, or a later GRANT re-opens a
  // write.
  it('ends by revoking every write on `public` from both client roles', () => {
    expect(lastStatement(grantsSql)).toMatch(
      /^REVOKE\s+INSERT,\s*UPDATE,\s*DELETE,\s*TRUNCATE\s+ON\s+ALL\s+TABLES\s+IN\s+SCHEMA\s+public\s+FROM\s+anon,\s*authenticated$/i
    );
  });

  it('still allows public reads of the public catalogs', () => {
    for (const table of ['profiles', 'topic_posts', 'positions', 'chunks', 'likes']) {
      expect(effectivePrivileges(grantsSql, table, 'anon'), table).toContain('SELECT');
    }
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

  it('every table with RLS enabled has explicit GRANT or REVOKE in foreign_keys_and_grants.sql', () => {
    const rlsTables = tablesWithRlsEnabled();
    const grantTables = tablesWithGrantsOrRevokes();
    const missing = [...rlsTables].filter((t) => !grantTables.has(t));
    expect(missing, `tables with RLS but no GRANT/REVOKE: ${missing.join(', ')}`).toHaveLength(0);
  });
});
