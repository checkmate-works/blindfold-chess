import { describe, expect, it } from 'vitest';

import { buildAdminImageStoragePath } from './validation';

describe('buildAdminImageStoragePath', () => {
  it('files the object under its owner, named by the upload instant', () => {
    expect(buildAdminImageStoragePath('owner-1', 'image/png', 1_760_000_000_000)).toBe(
      'owner-1/1760000000000.png'
    );
  });

  it('gives a later upload of the same owner a different path', () => {
    const first = buildAdminImageStoragePath('owner-1', 'image/webp', 1);
    const second = buildAdminImageStoragePath('owner-1', 'image/webp', 2);
    expect(first).not.toBe(second);
  });
});
