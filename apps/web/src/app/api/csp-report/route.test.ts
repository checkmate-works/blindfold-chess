/**
 * Abuse guards on the public CSP-report beacon.
 *
 * This endpoint has to stay unauthenticated (browsers send no credentials with
 * report beacons), so everything it forwards to Sentry is attacker-supplied.
 * It has already taken the project's error reporting offline once by exhausting
 * the Sentry quota, which is why the assertions below are about bounds —
 * body size, and the cardinality of the values that become indexed tags or
 * fingerprints — rather than about parsing.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const captureMessage = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  captureMessage: (...args: unknown[]) => captureMessage(...args),
  captureException: vi.fn(),
}));

const { POST } = await import('./route');

function reportRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request('https://example.test/api/csp-report', {
    method: 'POST',
    headers: { 'content-type': 'application/csp-report', ...headers },
    body,
  });
}

function cspReport(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    'csp-report': {
      'effective-directive': 'script-src',
      'blocked-uri': 'https://evil.test/x.js',
      ...overrides,
    },
  });
}

/** The options object handed to `Sentry.captureMessage`. */
function lastCaptureOptions(): {
  fingerprint: string[];
  tags: Record<string, string | undefined>;
  extra: Record<string, unknown>;
} {
  return captureMessage.mock.calls.at(-1)?.[1];
}

beforeEach(() => {
  captureMessage.mockClear();
  // Forward every sampled report so the assertions are deterministic; the
  // sampler is a separate concern from the bounds under test.
  vi.spyOn(Math, 'random').mockReturnValue(0);
});

describe('POST /api/csp-report', () => {
  it('refuses a body over the size cap instead of buffering it', async () => {
    const oversized = 'x'.repeat(64 * 1024 + 1);

    const response = await POST(
      reportRequest(JSON.stringify({ 'csp-report': { pad: oversized } }))
    );

    expect(response.status).toBe(413);
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('refuses an oversized body declared via Content-Length without reading it', async () => {
    const response = await POST(
      reportRequest(cspReport(), { 'content-length': String(64 * 1024 + 1) })
    );

    expect(response.status).toBe(413);
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('accepts a normal report', async () => {
    const response = await POST(reportRequest(cspReport()));

    expect(response.status).toBe(204);
    expect(captureMessage).toHaveBeenCalledTimes(1);
    expect(lastCaptureOptions().tags.csp_directive).toBe('script-src');
  });

  it('collapses an unknown directive so tags and fingerprints stay bounded', async () => {
    await POST(reportRequest(cspReport({ 'effective-directive': `made-up-${'a'.repeat(500)}` })));

    const { tags, fingerprint, extra } = lastCaptureOptions();
    expect(tags.csp_directive).toBe('other');
    expect(fingerprint).toEqual(['csp-violation', 'other']);
    // The raw value is still available for debugging — `extra` is not indexed.
    expect(String(extra.rawDirective)).toContain('made-up-');
  });

  it('keeps only the directive name from a legacy full directive value', async () => {
    await POST(
      reportRequest(cspReport({ 'effective-directive': "style-src 'self' https://a.test" }))
    );

    expect(lastCaptureOptions().tags.csp_directive).toBe('style-src');
  });

  it('drops a blocked host that could not be a real hostname', async () => {
    const absurdHost = `${'a'.repeat(300)}.test`;

    await POST(reportRequest(cspReport({ 'blocked-uri': `https://${absurdHost}/x.js` })));

    expect(lastCaptureOptions().tags.blocked_host).toBeUndefined();
  });

  it('still records a genuine third-party host', async () => {
    await POST(reportRequest(cspReport({ 'blocked-uri': 'https://cdn.example.test/x.js' })));

    expect(lastCaptureOptions().tags.blocked_host).toBe('cdn.example.test');
  });
});
