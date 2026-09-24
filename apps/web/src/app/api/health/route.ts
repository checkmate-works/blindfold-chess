import { NextResponse } from 'next/server';

import { pingDatabase } from '@/lib/db';

/**
 * Liveness + database reachability for an external uptime monitor.
 *
 * Answers 200 `{ status: 'ok' }` when this function booted and the shared
 * pool got an answer to `select 1`, and 503 `{ status: 'unavailable' }` when
 * it did not. Being served at all proves the deploy boots and routes; the
 * query adds "app up but database unreachable", which is how a pooler that
 * has run out of client slots presents. Storage and auth are deliberately not
 * checked: each would add a network dependency — and a way to fail — to a
 * probe whose job is to be cheap and unambiguous.
 *
 * @design Open, uncached, and outside every gate
 * An uptime monitor calls this unauthenticated, from anywhere, on a schedule,
 * so nothing may stand between it and the handler. `src/proxy.ts` does not
 * run for `/api/*` (its matcher excludes the prefix), so there is no locale
 * redirect, session refresh or CSP rewrite. The origin check and rate limit
 * that mutating routes use (`@/lib/api-mutation-guard`) are opt-in per
 * handler, and this one deliberately opts out: it is a GET with no body and no
 * side effects, a monitor sends no Origin header, and the rate limiter writes
 * a Postgres row per request — connection pressure on the very resource the
 * probe must not load.
 *
 * `force-dynamic` plus `Cache-Control: no-store` keep every layer — Next's
 * route cache, the CDN, an intermediary — from ever answering for it: a
 * cached 200 would report a healthy database for as long as the entry lived.
 *
 * @design Why a failure is not sent to Sentry
 * The monitor will call this every 30–60 s for as long as an outage lasts, and
 * every call would produce the same event. Identical events at 100% delivery
 * are exactly what once exhausted this project's Sentry error quota mid-
 * incident and silenced every other alert with it. The outage is already
 * reported where it belongs — the monitor alerts on the 503 — and the real
 * requests failing alongside it reach Sentry through their own paths. A
 * console line is kept so the runtime log still shows when probes started
 * failing; it carries no error detail, so the log cannot leak one either.
 *
 * The body likewise says only `ok` / `unavailable`: this URL is public, and a
 * driver error can name hosts, users and pooler internals.
 */
export const dynamic = 'force-dynamic';

/**
 * How long the probe waits for `select 1` before calling the database
 * unavailable.
 *
 * A healthy answer takes milliseconds on a warm connection and well under a
 * second on a fresh one (TLS and auth against the pooler included), so three
 * seconds is far outside normal while still an order of magnitude below the
 * timeouts uptime monitors typically apply to the whole request — a hung
 * pooler therefore shows up as a prompt 503, not as the monitor's own
 * timeout, which would be indistinguishable from the app being down. It is
 * also below the pool's 10 s `connect_timeout` and the 10 s query deadline,
 * so the probe never waits on either of them.
 */
const HEALTH_DB_TIMEOUT_MS = 3_000;

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export async function GET(): Promise<NextResponse> {
  const outcome = await pingDatabase(HEALTH_DB_TIMEOUT_MS);
  if (outcome === 'ok') {
    return NextResponse.json({ status: 'ok' }, { status: 200, headers: NO_STORE });
  }
  console.error('[health] database probe failed');
  return NextResponse.json({ status: 'unavailable' }, { status: 503, headers: NO_STORE });
}
