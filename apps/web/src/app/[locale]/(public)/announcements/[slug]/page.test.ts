/**
 * Metadata for the announcement detail page. The page body gates a
 * members-only announcement behind sign-in, but `generateMetadata` runs for
 * every visitor, crawlers included — so what it emits is what the gate has to
 * hold back too.
 */
import { describe, expect, it, vi } from 'vitest';

import type { Announcement } from '@/lib/db';

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
}));

vi.mock('@/i18n/routing', () => ({
  Link: () => null,
  routing: { locales: ['en', 'es', 'pt-BR', 'ja'] },
}));

vi.mock('@/lib/supabase/server');

vi.mock('@/app/_components/LazyMarkdownRenderer', () => ({ LazyMarkdownRenderer: () => null }));

const getPublishedAnnouncement = vi.fn();
vi.mock('../_lib/queries', () => ({
  getPublishedAnnouncement: (...args: unknown[]) => getPublishedAnnouncement(...args),
}));

const { generateMetadata } = await import('./page');

const BODY = 'The members-only body that the sign-in gate withholds.';

const announcement = (visibility: Announcement['visibility']) => ({
  id: 'ann-1',
  slug: 'notice',
  title: 'Notice title',
  content: BODY,
  locale: 'en',
  status: 'published',
  visibility,
  showAsBanner: false,
  pinnedAt: null,
  publishedAt: new Date('2026-01-15T00:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
});

async function metadataFor(visibility: Announcement['visibility']) {
  getPublishedAnnouncement.mockResolvedValueOnce({
    announcement: announcement(visibility),
    availableLocales: ['en'],
  });
  return generateMetadata({ params: Promise.resolve({ locale: 'en', slug: 'notice' }) });
}

describe('announcement detail generateMetadata', () => {
  it('describes a public announcement from its body', async () => {
    const metadata = await metadataFor('public');

    expect(metadata.description).toBe(BODY);
    expect(metadata.openGraph?.description).toBe(BODY);
  });

  it('emits nothing derived from the body of a members-only announcement', async () => {
    const metadata = await metadataFor('members_only');

    expect(JSON.stringify(metadata)).not.toContain('withholds');
    expect(metadata).not.toHaveProperty('description', expect.anything());
    expect(metadata.openGraph).not.toHaveProperty('description');
  });

  it('keeps the title of a members-only announcement, which the listing already shows', async () => {
    const metadata = await metadataFor('members_only');

    expect(JSON.stringify(metadata.title)).toContain('Notice title');
  });
});
