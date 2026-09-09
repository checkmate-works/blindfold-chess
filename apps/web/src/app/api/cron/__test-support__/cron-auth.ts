import { type Mock, afterEach, expect, it } from 'vitest';

/** A GET to `path`, with the `authorization` header set only when given. */
export function makeCronRequest(path: string, authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader !== undefined) {
    headers.set('authorization', authHeader);
  }
  return new Request(`http://localhost${path}`, { method: 'GET', headers });
}

/**
 * Puts `CRON_SECRET` back after each test in the enclosing `describe`, so a
 * test may set, blank or delete it without leaking into the next one.
 */
export function restoreCronSecretAfterEach(): void {
  const original = process.env.CRON_SECRET;
  afterEach(() => {
    if (original === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = original;
    }
  });
}

type CronRoute = {
  /** The route's path, for the request URL. */
  path: string;
  handler: (request: Request) => Promise<Response>;
  /** The job the route runs once authenticated; must stay untouched on every rejection. */
  job: Mock;
};

/**
 * The rejections every cron route shares, registered as five `it`s inside the
 * caller's `describe`. Call {@link restoreCronSecretAfterEach} there too.
 *
 * Covers:
 *   - SEC-006 misconfig: when CRON_SECRET is unset/empty, return 500
 *     instead of accidentally accepting `Bearer undefined`.
 *   - SEC-006 timing-safe compare: a wrong header returns 401. We do not
 *     assert on actual timing here (Vitest cannot reliably measure
 *     constant-time behavior); we instead assert response shapes and that
 *     mismatched-length headers cleanly return 401 without throwing.
 *
 * What passes the gate — the 200 body, the post-auth failure — is the route's
 * own and stays in its suite.
 */
export function itRejectsUnauthenticatedCronCalls({ path, handler, job }: CronRoute): void {
  it('returns 500 when CRON_SECRET is unset (misconfig — must not accept "Bearer undefined")', async () => {
    delete process.env.CRON_SECRET;

    const res = await handler(makeCronRequest(path, 'Bearer undefined'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Server misconfigured' });
    expect(job).not.toHaveBeenCalled();
  });

  it('returns 500 when CRON_SECRET is empty string (also a misconfig)', async () => {
    process.env.CRON_SECRET = '';

    const res = await handler(makeCronRequest(path, 'Bearer '));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: 'Server misconfigured' });
    expect(job).not.toHaveBeenCalled();
  });

  it('returns 401 when authorization header is missing', async () => {
    process.env.CRON_SECRET = 'super-secret';

    const res = await handler(makeCronRequest(path));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(job).not.toHaveBeenCalled();
  });

  it('returns 401 when bearer token does not match', async () => {
    process.env.CRON_SECRET = 'super-secret';

    const res = await handler(makeCronRequest(path, 'Bearer wrong-secret'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(job).not.toHaveBeenCalled();
  });

  it('returns 401 when header length differs from expected (mismatched-length must not throw)', async () => {
    process.env.CRON_SECRET = 'super-secret-very-long';

    // timingSafeEqual itself throws on unequal-length inputs; the route
    // must short-circuit before calling it. If this test ever surfaces
    // a 500, the length-guard regressed.
    const res = await handler(makeCronRequest(path, 'Bearer x'));
    expect(res.status).toBe(401);
    expect(job).not.toHaveBeenCalled();
  });
}
