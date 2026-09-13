import { describe, expect, it } from 'vitest';

import { resolveAuthorName, resolveNullableAuthorName } from './display-name';

const DELETED = '(deleted user)';
const ANONYMOUS = 'Anonymous';
const LABELS = { anonymous: ANONYMOUS, deleted: DELETED };

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

describe('resolveNullableAuthorName', () => {
  it('names the author when the profile joined', () => {
    expect(
      resolveNullableAuthorName(
        { authorId: 'u1', profile: { displayName: 'Alice', username: 'alice99' } },
        LABELS
      )
    ).toBe('Alice');
  });

  // The bug this function exists for: a game published without signing in has
  // no owner at all, and the gallery called every one of them "(deleted user)".
  it('calls a game nobody owns anonymous, not deleted', () => {
    expect(resolveNullableAuthorName({ authorId: null, profile: null }, LABELS)).toBe(ANONYMOUS);
  });

  // The other half of the same null: an owner exists, but their profile was
  // soft-deleted, so the join dropped it.
  it('calls an owned game with no profile deleted, not anonymous', () => {
    expect(resolveNullableAuthorName({ authorId: 'u1', profile: null }, LABELS)).toBe(DELETED);
  });

  // A provisional account — signed in, no profile row yet — reaches the same
  // state as a deleted one, which is why `publishGameAction` stores a null
  // authorId for those authors rather than their user id.
  it('falls back to deleted for a profile with neither name field', () => {
    expect(
      resolveNullableAuthorName(
        { authorId: 'u1', profile: { displayName: '', username: '' } },
        LABELS
      )
    ).toBe(DELETED);
  });
});
