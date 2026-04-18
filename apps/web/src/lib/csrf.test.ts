import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn() }));

const Sentry = await import('@sentry/nextjs');
const { isValidOrigin } = await import('./csrf');

function createRequest(headers: Record<string, string> = {}): Request {
  return new Request('https://example.com/api/test', { headers });
}

describe('isValidOrigin', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(Sentry.captureMessage).mockClear();
  });

  it('should return false when Origin header is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com');

    const result = isValidOrigin(createRequest());

    expect(result).toBe(false);
  });

  it('should return false when NEXT_PUBLIC_SITE_URL is not set', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');

    const result = isValidOrigin(createRequest({ origin: 'https://example.com' }));

    expect(result).toBe(false);
  });

  it('should return true when Origin matches NEXT_PUBLIC_SITE_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com');

    const result = isValidOrigin(createRequest({ origin: 'https://example.com' }));

    expect(result).toBe(true);
  });

  it('should return false when Origin does not match NEXT_PUBLIC_SITE_URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com');

    const result = isValidOrigin(createRequest({ origin: 'https://evil.com' }));

    expect(result).toBe(false);
  });

  it('should return false when Origin is a subdomain of allowed origin', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com');

    const result = isValidOrigin(createRequest({ origin: 'https://sub.example.com' }));

    expect(result).toBe(false);
  });

  it('should return false when Origin is a prefix match but different domain', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com');

    const result = isValidOrigin(createRequest({ origin: 'https://example.com.evil.com' }));

    expect(result).toBe(false);
  });

  it('should return true when NEXT_PUBLIC_SITE_URL has trailing slash', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com/');

    const result = isValidOrigin(createRequest({ origin: 'https://example.com' }));

    expect(result).toBe(true);
  });

  it('should return true when Origin has trailing slash', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com');

    const result = isValidOrigin(createRequest({ origin: 'https://example.com/' }));

    expect(result).toBe(true);
  });

  it('should return true when both Origin and NEXT_PUBLIC_SITE_URL have trailing slashes', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com/');

    const result = isValidOrigin(createRequest({ origin: 'https://example.com/' }));

    expect(result).toBe(true);
  });

  it('should return true when NEXT_PUBLIC_SITE_URL has multiple trailing slashes', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com///');

    const result = isValidOrigin(createRequest({ origin: 'https://example.com' }));

    expect(result).toBe(true);
  });

  it('should return true when Origin has multiple trailing slashes', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com');

    const result = isValidOrigin(createRequest({ origin: 'https://example.com///' }));

    expect(result).toBe(true);
  });

  it('should return false when NEXT_PUBLIC_SITE_URL is undefined', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;

    const result = isValidOrigin(createRequest({ origin: 'https://example.com' }));

    expect(result).toBe(false);
  });

  describe('Sentry notifications', () => {
    it('should not call captureMessage when Origin header is missing', () => {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com');

      isValidOrigin(createRequest());

      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });

    it('should call captureMessage when NEXT_PUBLIC_SITE_URL is not configured', () => {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');

      isValidOrigin(createRequest({ origin: 'https://example.com' }));

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'CSRF check failed: NEXT_PUBLIC_SITE_URL is not configured',
        'warning'
      );
    });

    it('should call captureMessage with origin value when Origin does not match', () => {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com');

      isValidOrigin(createRequest({ origin: 'https://evil.com' }));

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        'CSRF origin mismatch: received https://evil.com',
        'warning'
      );
    });

    it('should not call captureMessage when Origin matches', () => {
      vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.com');

      isValidOrigin(createRequest({ origin: 'https://example.com' }));

      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });
  });
});
