import { beforeEach, describe, expect, it, vi } from 'vitest';

const captureMessage = vi.fn();
const captureException = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  captureMessage: (...args: unknown[]) => captureMessage(...args),
  captureException: (...args: unknown[]) => captureException(...args),
}));

const { POST, parseCspReportSampleRate } = await import('./route');

function makeRequest(body: string, contentType: string, userAgent = 'vitest'): Request {
  return new Request('https://example.test/api/csp-report', {
    method: 'POST',
    headers: { 'content-type': contentType, 'user-agent': userAgent },
    body,
  });
}

const VALID_REPORT = JSON.stringify({
  'csp-report': {
    'violated-directive': 'script-src-elem',
    'effective-directive': 'script-src-elem',
    'blocked-uri': 'inline',
  },
});

describe('POST /api/csp-report', () => {
  beforeEach(() => {
    captureMessage.mockClear();
    captureException.mockClear();
  });

  it('acknowledges legacy `application/csp-report` payloads and forwards to Sentry', async () => {
    const body = JSON.stringify({
      'csp-report': {
        'document-uri': 'https://example.test/en',
        'violated-directive': 'script-src',
        'effective-directive': 'script-src',
        'blocked-uri': 'https://evil.example/x.js',
      },
    });

    const res = await POST(makeRequest(body, 'application/csp-report'));

    expect(res.status).toBe(204);
    expect(captureMessage).toHaveBeenCalledTimes(1);
    const [message, context] = captureMessage.mock.calls[0];
    expect(message).toBe('CSP violation');
    expect(context).toMatchObject({
      level: 'warning',
      tags: expect.objectContaining({ csp_directive: 'script-src' }),
    });
  });

  it('handles modern `application/reports+json` arrays', async () => {
    const body = JSON.stringify([
      {
        type: 'csp-violation',
        body: {
          effectiveDirective: 'img-src',
          blockedURL: 'https://evil.example/i.png',
          documentURL: 'https://example.test/en',
        },
      },
    ]);

    const res = await POST(makeRequest(body, 'application/reports+json'));

    expect(res.status).toBe(204);
    expect(captureMessage).toHaveBeenCalledTimes(1);
  });

  it('returns 204 for empty / malformed bodies without throwing', async () => {
    const emptyRes = await POST(makeRequest('', 'application/csp-report'));
    expect(emptyRes.status).toBe(204);

    const malformedRes = await POST(makeRequest('not-json', 'application/csp-report'));
    expect(malformedRes.status).toBe(204);

    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('drops directive-less reports without forwarding (empty Safari / bot junk)', async () => {
    const noDirective = JSON.stringify({ 'csp-report': { 'blocked-uri': '' } });
    const junk = JSON.stringify({ foo: 'bar' });

    const a = await POST(makeRequest(noDirective, 'application/csp-report'));
    const b = await POST(makeRequest(junk, 'application/csp-report'));

    expect(a.status).toBe(204);
    expect(b.status).toBe(204);
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('tags blocked_host with the host of the blocked URI', async () => {
    const body = JSON.stringify({
      'csp-report': {
        'violated-directive': 'font-src',
        'effective-directive': 'font-src',
        'blocked-uri': 'https://fonts.gstatic.com/s/x.woff2',
      },
    });

    await POST(makeRequest(body, 'application/csp-report'));

    expect(captureMessage).toHaveBeenCalledTimes(1);
    const [, context] = captureMessage.mock.calls[0];
    expect(context).toMatchObject({
      tags: expect.objectContaining({
        csp_directive: 'font-src',
        blocked_host: 'fonts.gstatic.com',
      }),
    });
  });

  it.each([
    // The exact UA observed reporting a bogus inline violation in production.
    'meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)',
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'facebookexternalhit/1.1',
    'curl/8.7.1',
  ])('drops reports from crawlers (%s)', async (userAgent) => {
    const res = await POST(makeRequest(VALID_REPORT, 'application/csp-report', userAgent));

    expect(res.status).toBe(204);
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it.each([
    // Real browsers whose UA must NOT be mistaken for a crawler.
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
    // HeadlessChrome is intentionally kept (Lighthouse / Playwright).
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/150.0.0.0 Safari/537.36',
  ])('still forwards reports from real browsers (%s)', async (userAgent) => {
    await POST(makeRequest(VALID_REPORT, 'application/csp-report', userAgent));

    expect(captureMessage).toHaveBeenCalledTimes(1);
  });

  it.each([
    'https://aceify.ai/assets/fonts/KaTeX_Main-Regular.ttf',
    'https://migaku-public-data.migaku.com/fonts/x.woff2',
    'http://themes.googleusercontent.com/static/fonts/x.woff',
  ])('drops violations caused by extension-injected assets (%s)', async (blockedUri) => {
    // These hosts belong to software the visitor installed. Forwarding them
    // would file an unfixable defect against this app; allow-listing them
    // would widen the policy for a third party we do not control.
    const body = JSON.stringify({
      'csp-report': {
        'violated-directive': 'font-src',
        'effective-directive': 'font-src',
        'blocked-uri': blockedUri,
      },
    });

    const res = await POST(makeRequest(body, 'application/csp-report'));

    expect(res.status).toBe(204);
    expect(captureMessage).not.toHaveBeenCalled();
  });

  it('still forwards font-src violations for hosts the app itself uses', async () => {
    // Guard against the drop list swallowing a real regression.
    const body = JSON.stringify({
      'csp-report': {
        'violated-directive': 'font-src',
        'effective-directive': 'font-src',
        'blocked-uri': 'https://fonts.gstatic.com/s/x.woff2',
      },
    });

    await POST(makeRequest(body, 'application/csp-report'));

    expect(captureMessage).toHaveBeenCalledTimes(1);
  });

  it('forwards nothing when CSP_REPORT_SAMPLE_RATE is 0', async () => {
    vi.stubEnv('CSP_REPORT_SAMPLE_RATE', '0');
    try {
      const body = JSON.stringify({
        'csp-report': {
          'effective-directive': 'script-src',
          'blocked-uri': 'https://evil.example/x.js',
        },
      });

      const res = await POST(makeRequest(body, 'application/csp-report'));

      expect(res.status).toBe(204);
      expect(captureMessage).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  /**
   * The endpoint has to stay unauthenticated, so every value it forwards is
   * attacker-supplied. These cover the bounds on that — body size, and the
   * cardinality of the values Sentry indexes as tags / fingerprints. It has
   * already exhausted the Sentry quota once and taken the project's error
   * reporting offline, so "bounded" is a correctness property here.
   */
  describe('abuse bounds', () => {
    function reportWith(overrides: Record<string, unknown>): string {
      return JSON.stringify({
        'csp-report': {
          'effective-directive': 'script-src',
          'blocked-uri': 'https://evil.example/x.js',
          ...overrides,
        },
      });
    }

    /** Options passed to the most recent `Sentry.captureMessage` call. */
    function lastContext(): {
      fingerprint: string[];
      tags: Record<string, string | undefined>;
      extra: Record<string, unknown>;
    } {
      return captureMessage.mock.calls.at(-1)?.[1];
    }

    it('refuses an oversized body rather than buffering it', async () => {
      const body = JSON.stringify({ 'csp-report': { pad: 'x'.repeat(64 * 1024 + 1) } });

      const res = await POST(makeRequest(body, 'application/csp-report'));

      expect(res.status).toBe(413);
      expect(captureMessage).not.toHaveBeenCalled();
    });

    it('refuses a body whose declared Content-Length exceeds the cap', async () => {
      const req = new Request('https://example.test/api/csp-report', {
        method: 'POST',
        headers: {
          'content-type': 'application/csp-report',
          'user-agent': 'vitest',
          'content-length': String(64 * 1024 + 1),
        },
        body: VALID_REPORT,
      });

      const res = await POST(req);

      expect(res.status).toBe(413);
      expect(captureMessage).not.toHaveBeenCalled();
    });

    it('collapses an unrecognised directive so tags and fingerprints stay bounded', async () => {
      const invented = `made-up-${'a'.repeat(500)}`;

      await POST(
        makeRequest(reportWith({ 'effective-directive': invented }), 'application/csp-report')
      );

      const { tags, fingerprint, extra } = lastContext();
      expect(tags.csp_directive).toBe('other');
      expect(fingerprint).toEqual(['csp-violation', 'other']);
      // Still debuggable: `extra` is not indexed, so the raw value is safe there.
      expect(extra.rawDirective).toBe(invented);
    });

    it('keeps only the directive name from a legacy full directive value', async () => {
      const body = reportWith({ 'effective-directive': "style-src 'self' https://a.example" });

      await POST(makeRequest(body, 'application/csp-report'));

      expect(lastContext().tags.csp_directive).toBe('style-src');
    });

    it('drops a blocked host that could not be a real hostname', async () => {
      const body = reportWith({ 'blocked-uri': `https://${'a'.repeat(300)}.example/x.js` });

      await POST(makeRequest(body, 'application/csp-report'));

      expect(lastContext().tags.blocked_host).toBeUndefined();
    });
  });
});

describe('parseCspReportSampleRate', () => {
  // Pure — the clamp branches that decide whether this open, attacker-
  // reachable endpoint can flood the Sentry quota, with no env stubbing.
  it('accepts a valid rate inside [0, 1]', () => {
    expect(parseCspReportSampleRate('0', false)).toBe(0);
    expect(parseCspReportSampleRate('0.25', false)).toBe(0.25);
    expect(parseCspReportSampleRate('1', false)).toBe(1);
  });

  it.each(['abc', 'NaN', '-0.5', '1.5', 'Infinity'])(
    'falls back to the default for the unusable value %p',
    (raw) => {
      expect(parseCspReportSampleRate(raw, true)).toBe(0.1);
      expect(parseCspReportSampleRate(raw, false)).toBe(1);
    }
  );

  it('treats a blank value as an explicit rate of 0, not as unset', () => {
    // `Number('')` is 0, which passes the finite/in-range test — so setting
    // CSP_REPORT_SAMPLE_RATE to an empty string drops every report rather
    // than falling back to the default. Documented rather than changed:
    // this is the behavior the endpoint has always had.
    expect(parseCspReportSampleRate('', true)).toBe(0);
    expect(parseCspReportSampleRate(' ', false)).toBe(0);
  });

  it('defaults to a 10% cap in production and full fidelity elsewhere', () => {
    expect(parseCspReportSampleRate(undefined, true)).toBe(0.1);
    expect(parseCspReportSampleRate(undefined, false)).toBe(1);
  });
});
