import { describe, expect, it, vi } from 'vitest';

import {
  type AnnouncementListingRow,
  MOBILE_ANNOUNCEMENTS_PER_PAGE,
  mobileAnnouncementLocale,
  mobileAnnouncementPageNumber,
  toMobileAnnouncementPage,
} from './announcements';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/db', () => ({ db: {}, announcements: {} }));
vi.mock('@/lib/db/announcements-visibility', () => ({
  publiclyVisibleAnnouncement: () => undefined,
}));

const row = (overrides: Partial<AnnouncementListingRow>): AnnouncementListingRow => ({
  slug: 'a',
  title: 'A',
  locale: 'en',
  pinnedAt: null,
  publishedAt: '2026-11-01T00:00:00.000Z',
  ...overrides,
});

describe('toMobileAnnouncementPage', () => {
  it("shows each slug once, in the reader's locale, keeping the slug's place", () => {
    const page = toMobileAnnouncementPage(
      [
        row({ slug: 'pinned', title: 'Pinned', pinnedAt: '2026-11-02T00:00:00.000Z' }),
        row({ slug: 'new', title: 'New', locale: 'en' }),
        row({ slug: 'new', title: '新着', locale: 'ja' }),
        row({ slug: 'old', title: 'Old', locale: 'es' }),
      ],
      'ja',
      1
    );

    expect(page).toEqual({
      items: [
        { slug: 'pinned', title: 'Pinned', publishedAt: '2026-11-01T00:00:00.000Z', pinned: true },
        { slug: 'new', title: '新着', publishedAt: '2026-11-01T00:00:00.000Z', pinned: false },
        { slug: 'old', title: 'Old', publishedAt: '2026-11-01T00:00:00.000Z', pinned: false },
      ],
      page: 1,
      totalPages: 1,
    });
  });

  it('falls back to the default locale before any other', () => {
    const page = toMobileAnnouncementPage(
      [row({ title: 'Spanish', locale: 'es' }), row({ title: 'English', locale: 'en' })],
      'ja',
      1
    );
    expect(page.items.map((item) => item.title)).toEqual(['English']);
  });

  it('serialises a Date the query handed back', () => {
    const page = toMobileAnnouncementPage(
      [row({ publishedAt: new Date('2026-10-05T09:00:00Z') })],
      'en',
      1
    );
    expect(page.items[0].publishedAt).toBe('2026-10-05T09:00:00.000Z');
  });

  it('pages by the listing size and clamps a page past the end', () => {
    const rows = Array.from({ length: MOBILE_ANNOUNCEMENTS_PER_PAGE + 1 }, (_, i) =>
      row({ slug: `s${i}` })
    );
    expect(toMobileAnnouncementPage(rows, 'en', 1).items).toHaveLength(
      MOBILE_ANNOUNCEMENTS_PER_PAGE
    );
    expect(toMobileAnnouncementPage(rows, 'en', 9)).toMatchObject({
      items: [{ slug: `s${MOBILE_ANNOUNCEMENTS_PER_PAGE}` }],
      page: 2,
      totalPages: 2,
    });
  });

  it('answers an empty list as one empty page', () => {
    expect(toMobileAnnouncementPage([], 'en', 3)).toEqual({ items: [], page: 1, totalPages: 1 });
  });
});

describe('query parameters', () => {
  it('reads a supported locale and defaults the rest to en', () => {
    expect(mobileAnnouncementLocale('pt-BR')).toBe('pt-BR');
    expect(mobileAnnouncementLocale('fr')).toBe('en');
    expect(mobileAnnouncementLocale(null)).toBe('en');
  });

  it('reads a positive integer page and defaults the rest to 1', () => {
    expect(mobileAnnouncementPageNumber('2')).toBe(2);
    expect(mobileAnnouncementPageNumber('0')).toBe(1);
    expect(mobileAnnouncementPageNumber('1.5')).toBe(1);
    expect(mobileAnnouncementPageNumber('x')).toBe(1);
    expect(mobileAnnouncementPageNumber(null)).toBe(1);
  });
});
