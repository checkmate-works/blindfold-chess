import { describe, expect, it, vi } from 'vitest';

import { createLichessThrottle } from './lichess';

vi.mock('server-only', () => ({}));

describe('createLichessThrottle', () => {
  it('starts full and decrements on each acquire', () => {
    const now = 1_000;
    const t = createLichessThrottle({
      tokensPerMinute: 30,
      capacity: 3,
      cooldownMs: 60_000,
      now: () => now,
    });

    expect(t.tryAcquire()).toBe(true);
    expect(t.tryAcquire()).toBe(true);
    expect(t.tryAcquire()).toBe(true);
    expect(t.tryAcquire()).toBe(false);
  });

  it('refills tokens over time at the configured rate', () => {
    let now = 0;
    const t = createLichessThrottle({
      tokensPerMinute: 60, // 1 token/sec
      capacity: 2,
      cooldownMs: 60_000,
      now: () => now,
    });

    t.tryAcquire();
    t.tryAcquire();
    expect(t.tryAcquire()).toBe(false);

    // 1 second later → exactly 1 token refilled.
    now += 1_000;
    expect(t.tryAcquire()).toBe(true);
    expect(t.tryAcquire()).toBe(false);
  });

  it('cooldown blocks all acquires for cooldownMs even with refilled tokens', () => {
    let now = 0;
    const t = createLichessThrottle({
      tokensPerMinute: 600, // refills fast
      capacity: 5,
      cooldownMs: 60_000,
      now: () => now,
    });

    t.cooldown();
    expect(t.tryAcquire()).toBe(false);

    now += 30_000;
    expect(t.tryAcquire()).toBe(false);

    now += 30_001;
    expect(t.tryAcquire()).toBe(true);
  });
});
