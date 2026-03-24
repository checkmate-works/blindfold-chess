import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore, checkIpRateLimit } from './rate-limit-ip';

describe('checkIpRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    _resetStore();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const config = { maxRequests: 3, windowMs: 60_000 };

  it('should allow the first request', () => {
    expect(checkIpRateLimit('192.168.1.1', 'test', config)).toEqual({
      allowed: true,
    });
  });

  it('should allow up to maxRequests within the window', () => {
    expect(checkIpRateLimit('10.0.0.1', 'test', config)).toEqual({
      allowed: true,
    });
    expect(checkIpRateLimit('10.0.0.1', 'test', config)).toEqual({
      allowed: true,
    });
    expect(checkIpRateLimit('10.0.0.1', 'test', config)).toEqual({
      allowed: true,
    });
  });

  it('should block requests exceeding maxRequests', () => {
    for (let i = 0; i < 3; i++) {
      checkIpRateLimit('10.0.0.2', 'test', config);
    }
    expect(checkIpRateLimit('10.0.0.2', 'test', config)).toEqual({
      allowed: false,
    });
  });

  it('should track different IPs independently', () => {
    for (let i = 0; i < 3; i++) {
      checkIpRateLimit('10.0.0.3', 'test', config);
    }
    expect(checkIpRateLimit('10.0.0.3', 'test', config)).toEqual({
      allowed: false,
    });

    expect(checkIpRateLimit('10.0.0.4', 'test', config)).toEqual({
      allowed: true,
    });
  });

  it('should track different actions independently', () => {
    for (let i = 0; i < 3; i++) {
      checkIpRateLimit('10.0.0.5', 'actionA', config);
    }
    expect(checkIpRateLimit('10.0.0.5', 'actionA', config)).toEqual({
      allowed: false,
    });

    expect(checkIpRateLimit('10.0.0.5', 'actionB', config)).toEqual({
      allowed: true,
    });
  });

  it('should reset after the window expires', () => {
    for (let i = 0; i < 3; i++) {
      checkIpRateLimit('10.0.0.6', 'test', config);
    }
    expect(checkIpRateLimit('10.0.0.6', 'test', config)).toEqual({
      allowed: false,
    });

    vi.advanceTimersByTime(60_000);

    expect(checkIpRateLimit('10.0.0.6', 'test', config)).toEqual({
      allowed: true,
    });
  });

  it('should still block before the full window elapses', () => {
    for (let i = 0; i < 3; i++) {
      checkIpRateLimit('10.0.0.7', 'test', config);
    }
    expect(checkIpRateLimit('10.0.0.7', 'test', config)).toEqual({
      allowed: false,
    });

    vi.advanceTimersByTime(59_999);

    expect(checkIpRateLimit('10.0.0.7', 'test', config)).toEqual({
      allowed: false,
    });
  });

  it('should respect different configs per action', () => {
    const strictConfig = { maxRequests: 1, windowMs: 10_000 };

    expect(checkIpRateLimit('10.0.0.8', 'strict', strictConfig)).toEqual({
      allowed: true,
    });
    expect(checkIpRateLimit('10.0.0.8', 'strict', strictConfig)).toEqual({
      allowed: false,
    });

    // Same IP, different action with lenient config still allowed
    expect(checkIpRateLimit('10.0.0.8', 'lenient', config)).toEqual({
      allowed: true,
    });
  });
});
