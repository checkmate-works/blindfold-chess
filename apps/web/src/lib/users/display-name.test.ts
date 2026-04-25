import { describe, expect, it } from 'vitest';

import { resolveAuthorName, resolveDisplayName } from './display-name';

describe('resolveDisplayName', () => {
  it('returns displayName when both displayName and username are present', () => {
    expect(resolveDisplayName({ displayName: 'Alice', username: 'alice99' })).toBe('Alice');
  });

  it('falls back to username when displayName is missing', () => {
    expect(resolveDisplayName({ displayName: null, username: 'alice99' })).toBe('alice99');
    expect(resolveDisplayName({ displayName: undefined, username: 'alice99' })).toBe('alice99');
    expect(resolveDisplayName({ displayName: '', username: 'alice99' })).toBe('alice99');
  });

  it('returns "Anonymous" when both displayName and username are missing', () => {
    expect(resolveDisplayName({ displayName: null, username: null })).toBe('Anonymous');
    expect(resolveDisplayName({ displayName: undefined, username: undefined })).toBe('Anonymous');
    expect(resolveDisplayName({ displayName: '', username: '' })).toBe('Anonymous');
  });

  it('returns "Anonymous" when profile itself is null or undefined', () => {
    expect(resolveDisplayName(null)).toBe('Anonymous');
    expect(resolveDisplayName(undefined)).toBe('Anonymous');
  });
});

describe('resolveAuthorName', () => {
  it('returns displayName when both displayName and username are present', () => {
    expect(resolveAuthorName({ displayName: 'Alice', username: 'alice99' })).toBe('Alice');
  });

  it('returns username when displayName is empty/null and username is set', () => {
    expect(resolveAuthorName({ displayName: null, username: 'alice99' })).toBe('alice99');
    expect(resolveAuthorName({ displayName: '', username: 'alice99' })).toBe('alice99');
    expect(resolveAuthorName({ displayName: undefined, username: 'alice99' })).toBe('alice99');
  });

  it('returns the default fallback "Anonymous" when both fields are missing and no fallback option is supplied', () => {
    expect(resolveAuthorName({ displayName: null, username: null })).toBe('Anonymous');
    expect(resolveAuthorName({ displayName: '', username: '' })).toBe('Anonymous');
    expect(resolveAuthorName({ displayName: undefined, username: undefined })).toBe('Anonymous');
  });

  it('honors an explicit fallback when both fields are missing', () => {
    expect(resolveAuthorName({ displayName: null, username: null }, { fallback: '' })).toBe('');
    expect(resolveAuthorName({ displayName: '', username: '' }, { fallback: 'Unknown' })).toBe(
      'Unknown'
    );
  });

  it('returns the fallback when profile is null or undefined', () => {
    expect(resolveAuthorName(null)).toBe('Anonymous');
    expect(resolveAuthorName(undefined)).toBe('Anonymous');
    expect(resolveAuthorName(null, { fallback: '' })).toBe('');
    expect(resolveAuthorName(undefined, { fallback: 'Guest' })).toBe('Guest');
  });

  it('does NOT use the fallback when displayName or username has a value (even if empty fallback is supplied)', () => {
    expect(resolveAuthorName({ displayName: 'Alice', username: null }, { fallback: '' })).toBe(
      'Alice'
    );
    expect(resolveAuthorName({ displayName: null, username: 'alice99' }, { fallback: '' })).toBe(
      'alice99'
    );
  });

  // Documents current behavior: the helper relies on `||` truthiness, so a
  // whitespace-only displayName is still truthy and passes through verbatim.
  // If this ever changes (e.g., to trim before falling back), this test will
  // fail and force the change to be intentional.
  it('passes whitespace-only displayName through verbatim (does NOT fall back)', () => {
    expect(resolveAuthorName({ displayName: '   ', username: 'alice99' })).toBe('   ');
    expect(
      resolveAuthorName({ displayName: '\t\n', username: null }, { fallback: 'Unknown' })
    ).toBe('\t\n');
  });
});
