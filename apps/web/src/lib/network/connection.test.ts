import { describe, expect, it } from 'vitest';

import { type ConnectionSnapshot, shouldWarnBeforeLargeDownload } from './connection';

const make = (overrides: Partial<ConnectionSnapshot>): ConnectionSnapshot => ({
  available: true,
  ...overrides,
});

describe('shouldWarnBeforeLargeDownload', () => {
  it('warns when the API is unavailable (Firefox / Safari fallback)', () => {
    expect(shouldWarnBeforeLargeDownload({ available: false })).toBe(true);
  });

  it('does not warn on plain Wi-Fi without Data Saver', () => {
    expect(shouldWarnBeforeLargeDownload(make({ type: 'wifi', effectiveType: '4g' }))).toBe(false);
  });

  it('warns when Data Saver is on, regardless of link', () => {
    expect(
      shouldWarnBeforeLargeDownload(make({ type: 'wifi', effectiveType: '4g', saveData: true }))
    ).toBe(true);
  });

  it('warns on cellular', () => {
    expect(shouldWarnBeforeLargeDownload(make({ type: 'cellular', effectiveType: '4g' }))).toBe(
      true
    );
  });

  it('warns on slow effective types', () => {
    for (const effectiveType of ['slow-2g', '2g', '3g']) {
      expect(shouldWarnBeforeLargeDownload(make({ type: 'wifi', effectiveType }))).toBe(true);
    }
  });

  it('does not warn on 4g over ethernet', () => {
    expect(shouldWarnBeforeLargeDownload(make({ type: 'ethernet', effectiveType: '4g' }))).toBe(
      false
    );
  });

  it('treats an unknown link type with fast effectiveType as OK', () => {
    // The API is available and reports a fast bucket, but omits `type`
    // (common on many platforms). We trust the speed signal.
    expect(shouldWarnBeforeLargeDownload(make({ effectiveType: '4g' }))).toBe(false);
  });
});
