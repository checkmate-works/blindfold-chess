import { describe, expect, it } from 'vitest';

import { resolveAuthorName } from './display-name';

const DELETED = '(deleted user)';

describe('resolveAuthorName', () => {
  it('prefers displayName over username', () => {
    expect(
      resolveAuthorName({ displayName: 'Alice', username: 'alice99' }, { fallback: DELETED })
    ).toBe('Alice');
  });

  // The reason the chain is `||` and not `??`. A profile row can hold an empty
  // displayName, and `??` treats that as a value, so the name slot renders
  // blank instead of showing the username the profile does have.
  it('falls through an empty displayName to the username', () => {
    expect(resolveAuthorName({ displayName: '', username: 'alice99' }, { fallback: DELETED })).toBe(
      'alice99'
    );
    expect(
      resolveAuthorName({ displayName: null, username: 'alice99' }, { fallback: DELETED })
    ).toBe('alice99');
    expect(
      resolveAuthorName({ displayName: undefined, username: 'alice99' }, { fallback: DELETED })
    ).toBe('alice99');
  });

  it('uses the fallback only when neither field has a value', () => {
    expect(resolveAuthorName({ displayName: null, username: null }, { fallback: DELETED })).toBe(
      DELETED
    );
    expect(resolveAuthorName({ displayName: '', username: '' }, { fallback: DELETED })).toBe(
      DELETED
    );
    expect(resolveAuthorName(null, { fallback: DELETED })).toBe(DELETED);
    expect(resolveAuthorName(undefined, { fallback: DELETED })).toBe(DELETED);
  });

  // An empty fallback is how a caller says "render nothing here" — seeding a
  // form default, for instance, where the word "(deleted user)" would be wrong.
  // It must not be confused with "no fallback supplied".
  it('honours an empty-string fallback', () => {
    expect(resolveAuthorName({ displayName: null, username: null }, { fallback: '' })).toBe('');
    expect(resolveAuthorName({ displayName: 'Alice', username: null }, { fallback: '' })).toBe(
      'Alice'
    );
  });

  // Documents current behaviour: the chain relies on truthiness, so a
  // whitespace-only displayName is truthy and passes through verbatim. If this
  // ever changes to trim before falling back, this test forces the change to be
  // intentional.
  it('passes a whitespace-only displayName through verbatim', () => {
    expect(
      resolveAuthorName({ displayName: '   ', username: 'alice99' }, { fallback: DELETED })
    ).toBe('   ');
  });
});
