import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkRateLimit } from './rate-limiter';

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow the first request', () => {
    expect(checkRateLimit('192.168.1.1')).toEqual({ allowed: true });
  });

  it('should allow up to 3 requests within the window', () => {
    expect(checkRateLimit('10.0.0.1')).toEqual({ allowed: true });
    expect(checkRateLimit('10.0.0.1')).toEqual({ allowed: true });
    expect(checkRateLimit('10.0.0.1')).toEqual({ allowed: true });
  });

  it('should block the 4th request within the window', () => {
    expect(checkRateLimit('10.0.0.2')).toEqual({ allowed: true });
    expect(checkRateLimit('10.0.0.2')).toEqual({ allowed: true });
    expect(checkRateLimit('10.0.0.2')).toEqual({ allowed: true });
    expect(checkRateLimit('10.0.0.2')).toEqual({ allowed: false });
  });

  it('should track different IPs independently', () => {
    expect(checkRateLimit('10.0.0.3')).toEqual({ allowed: true });
    expect(checkRateLimit('10.0.0.3')).toEqual({ allowed: true });
    expect(checkRateLimit('10.0.0.3')).toEqual({ allowed: true });
    expect(checkRateLimit('10.0.0.3')).toEqual({ allowed: false });

    expect(checkRateLimit('10.0.0.4')).toEqual({ allowed: true });
  });

  it('should reset after the window expires', () => {
    expect(checkRateLimit('10.0.0.5')).toEqual({ allowed: true });
    expect(checkRateLimit('10.0.0.5')).toEqual({ allowed: true });
    expect(checkRateLimit('10.0.0.5')).toEqual({ allowed: true });
    expect(checkRateLimit('10.0.0.5')).toEqual({ allowed: false });

    vi.advanceTimersByTime(60_000);

    expect(checkRateLimit('10.0.0.5')).toEqual({ allowed: true });
  });

  it('should keep blocking after the 4th request until window expires', () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit('10.0.0.6');
    }
    expect(checkRateLimit('10.0.0.6')).toEqual({ allowed: false });
    expect(checkRateLimit('10.0.0.6')).toEqual({ allowed: false });
    expect(checkRateLimit('10.0.0.6')).toEqual({ allowed: false });
  });

  it('should still block before the full window elapses', () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit('10.0.0.7');
    }
    expect(checkRateLimit('10.0.0.7')).toEqual({ allowed: false });

    vi.advanceTimersByTime(59_999);

    expect(checkRateLimit('10.0.0.7')).toEqual({ allowed: false });
  });

  it('should allow re-exhausting the limit after window reset', () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit('10.0.0.8');
    }
    expect(checkRateLimit('10.0.0.8')).toEqual({ allowed: false });

    vi.advanceTimersByTime(60_000);

    expect(checkRateLimit('10.0.0.8')).toEqual({ allowed: true });
    expect(checkRateLimit('10.0.0.8')).toEqual({ allowed: true });
    expect(checkRateLimit('10.0.0.8')).toEqual({ allowed: true });
    expect(checkRateLimit('10.0.0.8')).toEqual({ allowed: false });
  });

  it('should clean up stale entries from other IPs during cleanup', () => {
    checkRateLimit('10.0.0.9');
    checkRateLimit('10.0.0.10');

    vi.advanceTimersByTime(60_000);

    // After window expires, these IPs should be cleaned up and get fresh limits
    expect(checkRateLimit('10.0.0.9')).toEqual({ allowed: true });
    expect(checkRateLimit('10.0.0.10')).toEqual({ allowed: true });
  });
});
