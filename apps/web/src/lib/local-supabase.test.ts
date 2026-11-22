import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { LOCAL_SUPABASE_API_PORT, LOCAL_SUPABASE_DB_PORT } from './local-supabase';

/**
 * The local stack's ports are set in `supabase/config.toml` and copied into
 * code that cannot read it (see the module TSDoc of `./local-supabase.ts`).
 * These tests fail when a copy drifts, so moving a port is a change to
 * `config.toml` plus the constants the failure names, not a repo-wide search.
 *
 * Reads the TOML with a section-aware scan instead of a parser: only two
 * integer keys are needed, and the repo has no TOML parser to depend on.
 *
 * The mobile file sits outside this package, so turbo would not rerun this
 * test when only that file changes; `apps/web/turbo.json` adds it to the
 * `test` task's inputs. Keep the two lists in step.
 */

const WEB_ROOT = resolve(__dirname, '../..');
const CONFIG_TOML = resolve(WEB_ROOT, 'supabase/config.toml');
const MOBILE_CONFIG = resolve(WEB_ROOT, '../mobile/src/auth/config.ts');

/** The integer `key` directly under `[section]` (not under `[section.sub]`). */
function readTomlPort(toml: string, section: string, key: string): number {
  let current: string | undefined;
  for (const raw of toml.split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    const header = /^\[([^\]]+)\]$/.exec(line);
    if (header) {
      current = header[1];
      continue;
    }
    if (current !== section) continue;
    const entry = new RegExp(`^${key}\\s*=\\s*(\\d+)$`).exec(line);
    if (entry) return Number(entry[1]);
  }
  throw new Error(
    `supabase/config.toml has no integer \`${key}\` under [${section}]. If it was moved to ` +
      'an env() value, update this test and the constants in src/lib/local-supabase.ts.'
  );
}

describe('local Supabase ports match supabase/config.toml', () => {
  const toml = readFileSync(CONFIG_TOML, 'utf8');

  it('LOCAL_SUPABASE_API_PORT is [api] port', () => {
    expect(LOCAL_SUPABASE_API_PORT).toBe(readTomlPort(toml, 'api', 'port'));
  });

  it('LOCAL_SUPABASE_DB_PORT is [db] port', () => {
    expect(LOCAL_SUPABASE_DB_PORT).toBe(readTomlPort(toml, 'db', 'port'));
  });

  it("the mobile app's LOCAL_SUPABASE_API_PORT is [api] port", () => {
    // Read as text: importing the mobile module would pull in React Native.
    const source = readFileSync(MOBILE_CONFIG, 'utf8');
    const match = /export const LOCAL_SUPABASE_API_PORT = (\d+);/.exec(source);
    expect(
      match,
      'apps/mobile/src/auth/config.ts no longer declares LOCAL_SUPABASE_API_PORT'
    ).not.toBeNull();
    expect(Number(match?.[1])).toBe(readTomlPort(toml, 'api', 'port'));
  });
});
