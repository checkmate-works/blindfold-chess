import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();

vi.mock('next/headers', () => ({
  headers: () =>
    Promise.resolve({
      get: mockGet,
    }),
}));

const { getClientIp } = await import('./getClientIp');

// Priority: x-real-ip > x-vercel-forwarded-for > LAST entry of x-forwarded-for > null.
function setHeaders(map: Record<string, string | null>) {
  mockGet.mockImplementation((name: string) => {
    const lower = name.toLowerCase();
    return lower in map ? map[lower] : null;
  });
}

describe('getClientIp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers x-real-ip over every other header', async () => {
    setHeaders({
      'x-real-ip': '203.0.113.50',
      'x-vercel-forwarded-for': '198.51.100.1',
      'x-forwarded-for': '1.2.3.4, 5.6.7.8',
    });
    expect(await getClientIp()).toBe('203.0.113.50');
  });

  it('falls back to x-vercel-forwarded-for (first entry) when x-real-ip is absent', async () => {
    setHeaders({
      'x-vercel-forwarded-for': '198.51.100.1, 10.0.0.1',
      'x-forwarded-for': '1.2.3.4, 5.6.7.8',
    });
    expect(await getClientIp()).toBe('198.51.100.1');
  });

  it('falls back to the LAST entry of x-forwarded-for', async () => {
    setHeaders({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 203.0.113.50' });
    expect(await getClientIp()).toBe('203.0.113.50');
  });

  it('ignores attacker-supplied leading X-Forwarded-For entries', async () => {
    // An attacker set "attacker-spoof" as the first value; the real client IP
    // appended by Vercel is "198.51.100.1" at the END.
    setHeaders({ 'x-forwarded-for': 'attacker-spoof, middle-hop, 198.51.100.1' });
    expect(await getClientIp()).toBe('198.51.100.1');
  });

  it('returns a single IPv6 address correctly from x-forwarded-for', async () => {
    setHeaders({ 'x-forwarded-for': '2001:db8::1' });
    expect(await getClientIp()).toBe('2001:db8::1');
  });

  it('returns null when no known IP header is present', async () => {
    setHeaders({});
    expect(await getClientIp()).toBeNull();
  });

  it('returns null when x-forwarded-for is empty', async () => {
    setHeaders({ 'x-forwarded-for': '' });
    expect(await getClientIp()).toBeNull();
  });

  it('returns null when x-forwarded-for is only whitespace / commas', async () => {
    setHeaders({ 'x-forwarded-for': '  , , ' });
    expect(await getClientIp()).toBeNull();
  });

  it('trims whitespace around the chosen entry', async () => {
    setHeaders({ 'x-forwarded-for': '  1.2.3.4 ,  5.6.7.8  ' });
    expect(await getClientIp()).toBe('5.6.7.8');
  });

  it('trims whitespace around x-real-ip', async () => {
    setHeaders({ 'x-real-ip': '  10.0.0.1  ' });
    expect(await getClientIp()).toBe('10.0.0.1');
  });

  it('treats whitespace-only x-real-ip as absent and falls through', async () => {
    setHeaders({
      'x-real-ip': '   ',
      'x-forwarded-for': '1.2.3.4, 203.0.113.50',
    });
    expect(await getClientIp()).toBe('203.0.113.50');
  });
});
