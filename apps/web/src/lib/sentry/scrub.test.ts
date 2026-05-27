import { describe, expect, it } from 'vitest';

import { scrubInPlace } from './scrub';

describe('scrubInPlace', () => {
  it('redacts top-level sensitive keys', () => {
    const data: Record<string, unknown> = {
      email: 'user@example.com',
      password: 'hunter2',
    };

    scrubInPlace(data);

    expect(data.password).toBe('[Filtered]');
    expect(data.email).toBe('user@example.com');
  });

  it('redacts nested sensitive keys', () => {
    const data: Record<string, unknown> = {
      form: {
        currentPassword: 'old-secret',
        newPassword: 'new-secret',
        displayName: 'Alice',
      },
    };

    scrubInPlace(data);

    const form = data.form as Record<string, unknown>;
    expect(form.currentPassword).toBe('[Filtered]');
    expect(form.newPassword).toBe('[Filtered]');
    expect(form.displayName).toBe('Alice');
  });

  it('redacts sensitive keys inside array entries', () => {
    const data: Record<string, unknown> = {
      entries: [
        { id: 1, token: 'abc123' },
        { id: 2, label: 'safe' },
      ],
    };

    scrubInPlace(data);

    const entries = data.entries as Array<Record<string, unknown>>;
    expect(entries[0].token).toBe('[Filtered]');
    expect(entries[0].id).toBe(1);
    expect(entries[1].label).toBe('safe');
  });

  it('matches keys case-insensitively', () => {
    const data: Record<string, unknown> = {
      Password: 'shh',
      TOKEN_HASH: 'abc',
      Authorization: 'Bearer xyz',
    };

    scrubInPlace(data, ['password', 'token_hash']);

    expect(data.Password).toBe('[Filtered]');
    expect(data.TOKEN_HASH).toBe('[Filtered]');
    // Authorization was not in the list this call — untouched.
    expect(data.Authorization).toBe('Bearer xyz');
  });

  it('leaves non-sensitive keys untouched', () => {
    const data: Record<string, unknown> = {
      username: 'alice',
      meta: { createdAt: '2026-01-01', count: 3 },
    };

    scrubInPlace(data);

    expect(data.username).toBe('alice');
    expect(data.meta).toEqual({ createdAt: '2026-01-01', count: 3 });
  });

  it('is a no-op for non-object values', () => {
    // Should not throw for primitives / null / undefined.
    expect(() => scrubInPlace(null)).not.toThrow();
    expect(() => scrubInPlace(undefined)).not.toThrow();
    expect(() => scrubInPlace('password')).not.toThrow();
    expect(() => scrubInPlace(42)).not.toThrow();
  });
});
