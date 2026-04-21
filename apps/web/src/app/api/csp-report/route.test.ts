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
});
