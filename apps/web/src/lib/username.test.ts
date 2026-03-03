import { describe, expect, it } from 'vitest';

import { validateUsername } from './username';

describe('validateUsername', () => {
  it('returns null for valid usernames', () => {
    expect(validateUsername('ab')).toBeNull();
    expect(validateUsername('alice')).toBeNull();
    expect(validateUsername('bob123')).toBeNull();
    expect(validateUsername('a1')).toBeNull();
    expect(validateUsername('player_one')).toBeNull();
    expect(validateUsername('test_user_123')).toBeNull();
    expect(validateUsername('abcdefghijklmnopqrst')).toBeNull(); // 20 chars
  });

  it('returns too_short for usernames shorter than 2 characters', () => {
    expect(validateUsername('')).toBe('too_short');
    expect(validateUsername('a')).toBe('too_short');
  });

  it('returns too_long for usernames longer than 20 characters', () => {
    expect(validateUsername('abcdefghijklmnopqrstu')).toBe('too_long'); // 21 chars
  });

  it('returns invalid_format for usernames not starting with lowercase letter', () => {
    expect(validateUsername('1abc')).toBe('invalid_format');
    expect(validateUsername('_abc')).toBe('invalid_format');
    expect(validateUsername('Abc')).toBe('invalid_format');
  });

  it('returns invalid_format for usernames ending with underscore', () => {
    expect(validateUsername('abc_')).toBe('invalid_format');
  });

  it('returns invalid_format for usernames with consecutive underscores', () => {
    expect(validateUsername('ab__cd')).toBe('invalid_format');
  });

  it('returns invalid_format for usernames with uppercase letters', () => {
    expect(validateUsername('abCd')).toBe('invalid_format');
  });

  it('returns invalid_format for usernames with hyphens', () => {
    expect(validateUsername('ab-cd')).toBe('invalid_format');
  });

  it('returns invalid_format for usernames with spaces', () => {
    expect(validateUsername('ab cd')).toBe('invalid_format');
  });

  it('returns invalid_format for usernames with special characters', () => {
    expect(validateUsername('ab@cd')).toBe('invalid_format');
    expect(validateUsername('ab.cd')).toBe('invalid_format');
  });
});
