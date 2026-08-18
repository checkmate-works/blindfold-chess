import { describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();

vi.mock('next/headers', () => ({
  headers: () =>
    Promise.resolve({
      get: mockGet,
    }),
}));

const { getClientIp } = await import('./client-ip');

/**
 * Helper: simulate a specific set of request headers. Any header not in the
 * map is treated as absent (returns null).
 */
function setHeaders(map: Record<string, string | null>) {
  mockGet.mockImplementation((name: string) => {
    const lower = name.toLowerCase();
    return lower in map ? map[lower] : null;
  });
}

describe('getClientIp — header priority', () => {
  it('prefers x-real-ip over x-vercel-forwarded-for and x-forwarded-for', async () => {
    setHeaders({
      'x-real-ip': '203.0.113.50',
      'x-vercel-forwarded-for': '198.51.100.1',
      'x-forwarded-for': '1.2.3.4, 5.6.7.8',
    });
    expect(await getClientIp()).toBe('203.0.113.50');
  });

  it('prefers x-vercel-forwarded-for over x-forwarded-for when x-real-ip is missing', async () => {
    setHeaders({
      'x-vercel-forwarded-for': '198.51.100.1',
      'x-forwarded-for': '1.2.3.4, 5.6.7.8',
    });
    expect(await getClientIp()).toBe('198.51.100.1');
  });

  it('returns the last entry of x-forwarded-for as the real client IP', async () => {
    setHeaders({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 203.0.113.50' });
    expect(await getClientIp()).toBe('203.0.113.50');
  });

  it('returns null when no IP header is present', async () => {
    setHeaders({});
    expect(await getClientIp()).toBeNull();
  });
});

describe('getClientIp — spoofing resistance', () => {
  it('ignores an attacker-supplied leading value in x-forwarded-for', async () => {
    // Attacker prepends a forged value to X-Forwarded-For before the request
    // reaches Vercel; Vercel appends the real client IP at the end.
    setHeaders({ 'x-forwarded-for': '99.99.99.99, 198.51.100.1' });
    expect(await getClientIp()).toBe('198.51.100.1');
  });

  it('ignores multiple spoofed leading hops in x-forwarded-for', async () => {
    setHeaders({
      'x-forwarded-for': 'spoof-1, spoof-2, spoof-3, 203.0.113.50',
    });
    expect(await getClientIp()).toBe('203.0.113.50');
  });

  it('still trusts x-real-ip even when x-forwarded-for has spoofed leading entries', async () => {
    setHeaders({
      'x-real-ip': '203.0.113.99',
      'x-forwarded-for': 'attacker-value, other-value',
    });
    expect(await getClientIp()).toBe('203.0.113.99');
  });
});

describe('getClientIp — whitespace / empty handling', () => {
  it('trims whitespace around the selected x-forwarded-for entry', async () => {
    setHeaders({ 'x-forwarded-for': '  1.2.3.4 ,  5.6.7.8  ' });
    expect(await getClientIp()).toBe('5.6.7.8');
  });

  it('treats whitespace-only x-real-ip as absent and falls through', async () => {
    setHeaders({
      'x-real-ip': '   ',
      'x-forwarded-for': '1.2.3.4, 203.0.113.50',
    });
    expect(await getClientIp()).toBe('203.0.113.50');
  });

  it('returns null when x-forwarded-for is an empty string', async () => {
    setHeaders({ 'x-forwarded-for': '' });
    expect(await getClientIp()).toBeNull();
  });

  it('returns null when x-forwarded-for is only commas / whitespace', async () => {
    setHeaders({ 'x-forwarded-for': ' , , ' });
    expect(await getClientIp()).toBeNull();
  });

  it('handles IPv6 addresses in x-forwarded-for', async () => {
    setHeaders({ 'x-forwarded-for': '1.2.3.4, 2001:db8::1' });
    expect(await getClientIp()).toBe('2001:db8::1');
  });
});
