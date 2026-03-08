import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.fn();

vi.mock('next/headers', () => ({
  headers: () =>
    Promise.resolve({
      get: mockGet,
    }),
}));

const { getClientIp } = await import('./getClientIp');

describe('getClientIp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the first IP from x-forwarded-for with multiple comma-separated IPs', async () => {
    mockGet.mockReturnValue('203.0.113.50, 70.41.3.18, 150.172.238.178');

    const result = await getClientIp();
    expect(result).toBe('203.0.113.50');
  });

  it('should return null when x-forwarded-for header is not present', async () => {
    mockGet.mockReturnValue(null);

    const result = await getClientIp();
    expect(result).toBeNull();
  });

  it('should return null when x-forwarded-for is an empty string', async () => {
    mockGet.mockReturnValue('');

    const result = await getClientIp();
    expect(result).toBeNull();
  });

  it('should return the single IP when x-forwarded-for has only one IP', async () => {
    mockGet.mockReturnValue('192.168.1.1');

    const result = await getClientIp();
    expect(result).toBe('192.168.1.1');
  });

  it('should trim whitespace from the IP address', async () => {
    mockGet.mockReturnValue('  10.0.0.1  , 172.16.0.1');

    const result = await getClientIp();
    expect(result).toBe('10.0.0.1');
  });

  it('should return null when x-forwarded-for contains only whitespace', async () => {
    mockGet.mockReturnValue('   ');

    const result = await getClientIp();
    expect(result).toBeNull();
  });

  it('should handle IPv6 addresses', async () => {
    mockGet.mockReturnValue('2001:db8::1, 10.0.0.1');

    const result = await getClientIp();
    expect(result).toBe('2001:db8::1');
  });
});
