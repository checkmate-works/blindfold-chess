import { SUPPORTED_LOCALES } from '@/config';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildProfileArchiveMetadata } from './archive-metadata';

const mockGetProfileByUsername = vi.fn();

vi.mock('./queries', () => ({
  getProfileByUsername: (...args: unknown[]) => mockGetProfileByUsername(...args),
}));

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => `[${key}]`,
}));

const SITE = 'https://www.blindfold-chess.online';

describe('buildProfileArchiveMetadata', () => {
  const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = SITE;
    mockGetProfileByUsername.mockResolvedValue({ displayName: 'Alice' });
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
    mockGetProfileByUsername.mockReset();
  });

  it('returns empty metadata for an unknown username', async () => {
    mockGetProfileByUsername.mockResolvedValue(null);

    const result = await buildProfileArchiveMetadata({
      locale: 'en',
      username: 'nobody',
      labelKey: 'gamesTab',
      segment: 'games',
    });

    expect(result).toEqual({});
  });

  it('titles the page "<archive> - <display name>"', async () => {
    const result = await buildProfileArchiveMetadata({
      locale: 'en',
      username: 'alice',
      labelKey: 'gamesTab',
      segment: 'games',
    });

    expect(result.title).toBe('[gamesTab] - Alice');
  });

  it('falls back to the username when the profile has no display name', async () => {
    mockGetProfileByUsername.mockResolvedValue({ displayName: '' });

    const result = await buildProfileArchiveMetadata({
      locale: 'en',
      username: 'alice',
      labelKey: 'topicsTab',
      segment: 'posts',
    });

    expect(result.title).toBe('[topicsTab] - alice');
  });

  it('emits an absolute canonical for the current locale', async () => {
    const result = await buildProfileArchiveMetadata({
      locale: 'ja',
      username: 'alice',
      labelKey: 'problemTypePuzzle',
      segment: 'problems/puzzles',
    });

    expect(result.alternates?.canonical).toBe(`${SITE}/ja/u/alice/problems/puzzles`);
    expect(result.openGraph?.url).toBe(`${SITE}/ja/u/alice/problems/puzzles`);
  });

  it('emits an hreflang entry for every supported locale plus x-default', async () => {
    const result = await buildProfileArchiveMetadata({
      locale: 'en',
      username: 'alice',
      labelKey: 'followersPageTitle',
      segment: 'followers',
    });

    const languages = result.alternates?.languages as Record<string, string>;
    expect(Object.keys(languages).sort()).toEqual([...SUPPORTED_LOCALES, 'x-default'].sort());
    for (const locale of SUPPORTED_LOCALES) {
      expect(languages[locale]).toBe(`${SITE}/${locale}/u/alice/followers`);
    }
    expect(languages['x-default']).toBe(`${SITE}/en/u/alice/followers`);
  });
});
