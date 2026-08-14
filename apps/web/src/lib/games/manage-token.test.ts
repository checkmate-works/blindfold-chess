import { describe, expect, it } from 'vitest';

const { generateManageToken, hashManageToken, manageTokenMatches } = await import('./manage-token');

describe('manage-token', () => {
  it('generates a token whose hash matches hashManageToken', () => {
    const { token, tokenHash } = generateManageToken();
    expect(tokenHash).toBe(hashManageToken(token));
  });

  it('produces a 64-char hex SHA-256 hash', () => {
    const { tokenHash } = generateManageToken();
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates distinct tokens each call', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateManageToken().token));
    expect(tokens.size).toBe(50);
  });

  it('matches the correct token against its stored hash', () => {
    const { token, tokenHash } = generateManageToken();
    expect(manageTokenMatches(token, tokenHash)).toBe(true);
  });

  it('rejects a wrong token', () => {
    const { tokenHash } = generateManageToken();
    const other = generateManageToken().token;
    expect(manageTokenMatches(other, tokenHash)).toBe(false);
  });

  it('rejects malformed / empty stored hashes without throwing', () => {
    const { token } = generateManageToken();
    expect(manageTokenMatches(token, '')).toBe(false);
    expect(manageTokenMatches(token, 'not-hex-zz')).toBe(false);
  });
});
