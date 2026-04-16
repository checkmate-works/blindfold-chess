import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { isValidOrigin } = await import('./csrf');

function createRequest(headers: Record<string, string> = {}): Request {
  return new Request('https://example.com/api/test', { headers });
}

describe('isValidOrigin', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
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
});
