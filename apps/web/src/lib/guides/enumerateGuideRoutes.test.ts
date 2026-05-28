import enMessages from '@/messages/en.json';
import { describe, expect, it } from 'vitest';

import { enumerateGuideRoutes, guideRouteToSegments } from './enumerateGuideRoutes';
import type { GuideRoutePath } from './enumerateGuideRoutes';

describe('enumerateGuideRoutes', () => {
  it('emits a root entry for every rank that has guide content', () => {
    const routes = enumerateGuideRoutes(enMessages.guides.pages as Record<string, unknown>);
    const roots = routes.filter((r) => r.kind === 'root').map((r) => r.slug);
    // Real i18n data currently has mukyu, 5kyu, 4kyu, 3kyu, 2kyu as flat guides.
    expect(roots).toEqual(expect.arrayContaining(['mukyu', '5kyu', '4kyu', '3kyu', '2kyu']));
    // Ranks without guide data must be absent.
    expect(roots).not.toContain('1kyu');
    expect(roots).not.toContain('1dan');
  });

  it('emits flat pages 2..N and never page 1 for a synthetic flat fixture', () => {
    const fixture = {
      '5kyu': {
        format: 'flat',
        pages: [{ paragraphs: ['a'] }, { paragraphs: ['b'] }, { paragraphs: ['c'] }],
      },
    } as Record<string, unknown>;
    const routes = enumerateGuideRoutes(fixture);
    const pagesFor5kyu = routes.filter((r) => r.slug === '5kyu');
    expect(pagesFor5kyu).toEqual([
      { slug: '5kyu', kind: 'root' },
      { slug: '5kyu', kind: 'flat-page', page: 2 },
      { slug: '5kyu', kind: 'flat-page', page: 3 },
    ]);
  });

  it('emits chapter roots and chapter pages 2..N for a synthetic chaptered fixture', () => {
    const fixture = {
      '3kyu': {
        format: 'chaptered',
        chapters: [
          {
            slug: 'diagonal',
            title: 'Diagonal',
            description: '',
            pages: [{ paragraphs: ['a'] }, { paragraphs: ['b'] }],
          },
          {
            slug: 'maneuvering',
            title: 'Maneuvering',
            description: '',
            pages: [{ paragraphs: ['c'] }],
          },
        ],
      },
    } as Record<string, unknown>;
    const routes = enumerateGuideRoutes(fixture);
    const pagesFor3kyu = routes.filter((r) => r.slug === '3kyu');
    expect(pagesFor3kyu).toEqual([
      { slug: '3kyu', kind: 'root' },
      { slug: '3kyu', kind: 'chapter-root', chapterSlug: 'diagonal' },
      { slug: '3kyu', kind: 'chapter-page', chapterSlug: 'diagonal', page: 2 },
      { slug: '3kyu', kind: 'chapter-root', chapterSlug: 'maneuvering' },
      // maneuvering has only 1 page → no chapter-page entries
    ]);
  });

  it('skips ranks with no valid guide entry', () => {
    const fixture = {
      '5kyu': { format: 'flat', pages: [{ paragraphs: ['a'] }] },
      '4kyu': 'not an object',
      '3kyu': { format: 'invalid' },
    } as Record<string, unknown>;
    const routes = enumerateGuideRoutes(fixture);
    expect(routes.map((r) => r.slug)).toEqual(['5kyu']);
  });

  it('returns an empty array for empty input', () => {
    expect(enumerateGuideRoutes({})).toEqual([]);
  });
});

describe('guideRouteToSegments', () => {
  it('maps root to [slug]', () => {
    const r: GuideRoutePath = { slug: '5kyu', kind: 'root' };
    expect(guideRouteToSegments(r)).toEqual(['5kyu']);
  });

  it('maps flat-page to [slug, page]', () => {
    const r: GuideRoutePath = { slug: '5kyu', kind: 'flat-page', page: 2 };
    expect(guideRouteToSegments(r)).toEqual(['5kyu', '2']);
  });

  it('maps chapter-root to [slug, chapterSlug]', () => {
    const r: GuideRoutePath = { slug: '3kyu', kind: 'chapter-root', chapterSlug: 'diagonal' };
    expect(guideRouteToSegments(r)).toEqual(['3kyu', 'diagonal']);
  });

  it('maps chapter-page to [slug, chapterSlug, page]', () => {
    const r: GuideRoutePath = {
      slug: '3kyu',
      kind: 'chapter-page',
      chapterSlug: 'diagonal',
      page: 3,
    };
    expect(guideRouteToSegments(r)).toEqual(['3kyu', 'diagonal', '3']);
  });
});
