import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { readTomlString, readTomlStringArray } from './__test-support__/read-toml';

/**
 * Where the local dev server listens is decided in two places, and copied
 * into files that cannot read either. These tests fail when a copy drifts.
 *
 * - The port is the `-p` of the `dev` script in `apps/web/package.json`.
 * - The origin a browser opens is `[auth] site_url` in `supabase/config.toml`:
 *   `http://chess.localhost:<port>`. The host is not plain `localhost`
 *   because cookies are scoped by host and not by port, so two products' dev
 *   servers on one machine would otherwise overwrite each other's login
 *   cookie (`docs/local-development.md`, "Dev server (Next)").
 *
 * To move the dev server, change those two and then the copies the failures
 * name. `.env.local` is a copy too, but it is gitignored and cannot be
 * checked here.
 *
 * Several of the files sit outside this package, so turbo would not rerun
 * this test when only they change; `apps/web/turbo.json` adds them to the
 * `test` task's inputs. Keep the two lists in step.
 */

const REPO_ROOT = resolve(__dirname, '../../../..');

function read(path: string): string {
  return readFileSync(resolve(REPO_ROOT, path), 'utf8');
}

/** The port in `next dev … -p <port>`. */
function devPort(): number {
  const pkg = JSON.parse(read('apps/web/package.json')) as { scripts?: Record<string, string> };
  const match = /\bnext dev\b.*\s-p\s+(\d+)\b/.exec(pkg.scripts?.dev ?? '');
  if (!match) {
    throw new Error(
      'The `dev` script of apps/web/package.json is no longer `next dev … -p <port>`. Without ' +
        'an explicit port it falls back to 3000, which other projects on the machine also use.'
    );
  }
  return Number(match[1]);
}

describe('the local dev server is addressed the same way everywhere', () => {
  const port = devPort();
  const toml = read('apps/web/supabase/config.toml');
  const siteUrl = readTomlString(toml, 'auth', 'site_url');

  it('config.toml site_url is chess.localhost on the dev port', () => {
    expect(siteUrl).toBe(`http://chess.localhost:${port}`);
  });

  it('config.toml additional_redirect_urls includes site_url', () => {
    expect(readTomlStringArray(toml, 'auth', 'additional_redirect_urls')).toContain(siteUrl);
  });

  it('.env.example NEXT_PUBLIC_SITE_URL is site_url', () => {
    const value = /^NEXT_PUBLIC_SITE_URL=(.*)$/m.exec(read('apps/web/.env.example'))?.[1];
    expect(value).toBe(siteUrl);
  });

  it("the mobile app's LOCAL_WEB_PORT is the dev port", () => {
    // Read as text: importing the mobile module would pull in React Native.
    const match = /export const LOCAL_WEB_PORT = (\d+);/.exec(
      read('apps/mobile/src/auth/config.ts')
    );
    expect(
      match,
      'apps/mobile/src/auth/config.ts no longer declares LOCAL_WEB_PORT'
    ).not.toBeNull();
    expect(Number(match?.[1])).toBe(port);
  });

  it('.claude/launch.json opens `web` at site_url on the dev port', () => {
    const launch = JSON.parse(read('.claude/launch.json')) as {
      configurations: { name: string; port?: number; url?: string }[];
    };
    const web = launch.configurations.find((c) => c.name === 'web');
    expect(web).toMatchObject({ port, url: siteUrl });
  });

  it("the cloud session's APP_URL is localhost on the dev port", () => {
    const match = /^APP_URL="http:\/\/localhost:(\d+)"$/m.exec(
      read('scripts/claude-cloud/config.sh')
    );
    expect(
      match,
      'scripts/claude-cloud/config.sh no longer declares APP_URL="http://localhost:<port>"'
    ).not.toBeNull();
    expect(Number(match?.[1])).toBe(port);
  });
});
