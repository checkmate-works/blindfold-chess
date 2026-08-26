import { describe, expect, it } from 'vitest';

import { maskEmail } from './mask-email';

describe('maskEmail', () => {
  it('keeps the first character of the local part and the whole domain', () => {
    expect(maskEmail('k_okishima@fuji.enterprises')).toBe('k***@fuji.enterprises');
  });

  it('does not leak the local-part length', () => {
    expect(maskEmail('a@example.com')).toBe('a***@example.com');
    expect(maskEmail('averylonglocalpart@example.com')).toBe('a***@example.com');
  });

  it('splits on the last @ so a quoted local part cannot smuggle the domain out', () => {
    expect(maskEmail('"weird@local"@example.com')).toBe('"***@example.com');
  });

  it('masks the whole value when there is no parseable local part', () => {
    expect(maskEmail('not-an-email')).toBe('***');
    expect(maskEmail('@example.com')).toBe('***');
    expect(maskEmail('')).toBe('***');
  });
});
