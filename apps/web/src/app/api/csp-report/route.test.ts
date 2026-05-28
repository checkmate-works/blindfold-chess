import { beforeEach, describe, expect, it, vi } from 'vitest';

const captureMessage = vi.fn();
const captureException = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  captureMessage: (...args: unknown[]) => captureMessage(...args),
  captureException: (...args: unknown[]) => captureException(...args),
}));

const { POST } = await import('./route');

function makeRequest(body: string, contentType: string): Request {
  return new Request('https://example.test/api/csp-report', {
    method: 'POST',
    headers: { 'content-type': contentType, 'user-agent': 'vitest' },
    body,
  });
}

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
});
