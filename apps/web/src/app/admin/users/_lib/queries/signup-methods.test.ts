import type { User } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { aggregateSignupMethodStats, getSignupMethod } from './signup-methods';

function makeUser(overrides: Partial<User> & { id?: string } = {}): User {
  return {
    id: overrides.id ?? 'user-1',
    app_metadata: {},
    user_metadata: {},
    aud: '',
    created_at: '',
    ...overrides,
  } as User;
}

describe('getSignupMethod', () => {
  it('returns "google" when app_metadata.provider is google', () => {
    const user = makeUser({ app_metadata: { provider: 'google' } });
    expect(getSignupMethod(user)).toBe('google');
  });

  it('returns "email" when app_metadata.provider is email', () => {
    const user = makeUser({ app_metadata: { provider: 'email' } });
    expect(getSignupMethod(user)).toBe('email');
  });

  it('returns "unknown" when app_metadata.provider is missing and no identities', () => {
    const user = makeUser({ app_metadata: {} });
    expect(getSignupMethod(user)).toBe('unknown');
  });

  it('falls back to identities[0].provider when app_metadata.provider is missing', () => {
    const user = makeUser({
      app_metadata: {},
      identities: [{ provider: 'google' }] as User['identities'],
    });
    expect(getSignupMethod(user)).toBe('google');
  });

  it('returns "unknown" for unrecognised providers (e.g., github)', () => {
    const user = makeUser({ app_metadata: { provider: 'github' } });
    expect(getSignupMethod(user)).toBe('unknown');
  });

  it('prefers app_metadata.provider over identities[0].provider', () => {
    const user = makeUser({
      app_metadata: { provider: 'email' },
      identities: [{ provider: 'google' }] as User['identities'],
    });
    expect(getSignupMethod(user)).toBe('email');
  });
});

describe('aggregateSignupMethodStats', () => {
  it('returns all three buckets in fixed order even when empty', () => {
    expect(aggregateSignupMethodStats([])).toEqual([
      { method: 'google', count: 0 },
      { method: 'email', count: 0 },
      { method: 'unknown', count: 0 },
    ]);
  });

  it('counts users by signup method', () => {
    const users = [
      makeUser({ id: 'a', app_metadata: { provider: 'google' } }),
      makeUser({ id: 'b', app_metadata: { provider: 'google' } }),
      makeUser({ id: 'c', app_metadata: { provider: 'email' } }),
      makeUser({ id: 'd', app_metadata: { provider: 'github' } }),
    ];
    expect(aggregateSignupMethodStats(users)).toEqual([
      { method: 'google', count: 2 },
      { method: 'email', count: 1 },
      { method: 'unknown', count: 1 },
    ]);
  });
});
