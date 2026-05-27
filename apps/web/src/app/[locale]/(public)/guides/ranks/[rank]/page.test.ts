/**
 * Route-level decision tests for the rank guide root page.
 *
 * We mock the heavy renderer (`renderGuideBody`) and `next/navigation`'s
 * `notFound` / `redirect`, so we can observe which branch the page decides
 * to take for a given input. The renderer itself is covered separately.
 */
import enMessages from '@/messages/en.json';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RankGuideDeepPage from './[...rest]/page';
import RankGuideRootPage from './page';

class NotFoundError extends Error {
  constructor() {
    super('NEXT_NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT:${url}`);
    this.name = 'RedirectError';
  }
}

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new NotFoundError();
  },
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));

vi.mock('next-intl/server', () => ({
  getTranslations: async () => {
    return Object.assign((key: string) => key, {
      raw: (key: string) => {
        if (key === 'pages') return enMessages.guides.pages;
        return undefined;
      },
    });
  },
}));

const renderSpy = vi.fn(async (args: unknown) => ({ rendered: args }));
vi.mock('./_lib/renderGuideBody', () => ({
  renderGuideBody: (args: unknown) => renderSpy(args),
}));

function mkParams<T extends Record<string, unknown>>(params: T): Promise<T> {
  return Promise.resolve(params);
}

beforeEach(() => {
  renderSpy.mockClear();
});

describe('RankGuideRootPage', () => {
  it('renders flat body page 1 for a flat rank', async () => {
    await RankGuideRootPage({ params: mkParams({ locale: 'en', rank: '5kyu' }) } as never);
    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(renderSpy).toHaveBeenCalledWith({
      kind: 'flat',
      locale: 'en',
      slug: '5kyu',
      pageNumber: 1,
    });
  });

  it('renders the mukyu rank via the new route', async () => {
    await RankGuideRootPage({ params: mkParams({ locale: 'ja', rank: 'mukyu' }) } as never);
    expect(renderSpy).toHaveBeenCalledWith({
      kind: 'flat',
      locale: 'ja',
      slug: 'mukyu',
      pageNumber: 1,
    });
  });

  it('calls notFound() for an unknown rank slug', async () => {
    await expect(
      RankGuideRootPage({ params: mkParams({ locale: 'en', rank: 'bogus' }) } as never)
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(renderSpy).not.toHaveBeenCalled();
  });

  it('calls notFound() for a rank without guide content (1kyu)', async () => {
    await expect(
      RankGuideRootPage({ params: mkParams({ locale: 'en', rank: '1kyu' }) } as never)
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(renderSpy).not.toHaveBeenCalled();
  });

  it('renders flat body page 1 for the 2kyu rank (guide published, requirements draft)', async () => {
    await RankGuideRootPage({ params: mkParams({ locale: 'ja', rank: '2kyu' }) } as never);
    expect(renderSpy).toHaveBeenCalledWith({
      kind: 'flat',
      locale: 'ja',
      slug: '2kyu',
      pageNumber: 1,
    });
  });
});

describe('RankGuideDeepPage', () => {
  const fivekyuPageCount = (
    enMessages.guides.pages as Record<string, { format: string; pages: unknown[] }>
  )['5kyu']!.pages.length;

  it('redirects /guides/ranks/5kyu/1 to the canonical root', async () => {
    await expect(
      RankGuideDeepPage({
        params: mkParams({ locale: 'en', rank: '5kyu', rest: ['1'] }),
      } as never)
    ).rejects.toMatchObject({
      name: 'RedirectError',
      url: '/en/guides/ranks/5kyu',
    });
    expect(renderSpy).not.toHaveBeenCalled();
  });

  it('renders page N for a valid flat page number', async () => {
    await RankGuideDeepPage({
      params: mkParams({ locale: 'en', rank: '5kyu', rest: ['2'] }),
    } as never);
    expect(renderSpy).toHaveBeenCalledWith({
      kind: 'flat',
      locale: 'en',
      slug: '5kyu',
      pageNumber: 2,
    });
  });

  // Out-of-range page: the route itself does not range-check; it delegates to
  // renderGuideBody. Covered by the renderer's own logic. Left here as a note.
  it.skip('calls notFound() when the page number is beyond the guide length', async () => {
    void fivekyuPageCount;
  });

  it('calls notFound() for page 0', async () => {
    await expect(
      RankGuideDeepPage({
        params: mkParams({ locale: 'en', rank: '5kyu', rest: ['0'] }),
      } as never)
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(renderSpy).not.toHaveBeenCalled();
  });

  it('calls notFound() for a negative page', async () => {
    await expect(
      RankGuideDeepPage({
        params: mkParams({ locale: 'en', rank: '5kyu', rest: ['-1'] }),
      } as never)
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(renderSpy).not.toHaveBeenCalled();
  });

  it('calls notFound() for an unknown rank', async () => {
    await expect(
      RankGuideDeepPage({
        params: mkParams({ locale: 'en', rank: 'bogus', rest: ['2'] }),
      } as never)
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(renderSpy).not.toHaveBeenCalled();
  });

  it('calls notFound() when the rest segments are malformed (too many parts)', async () => {
    await expect(
      RankGuideDeepPage({
        params: mkParams({ locale: 'en', rank: '5kyu', rest: ['a', 'b', 'c'] }),
      } as never)
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(renderSpy).not.toHaveBeenCalled();
  });

  it('delegates chapter-root rendering for a valid chapter slug segment', async () => {
    // Because no rank is chaptered yet in production i18n, we simply verify the
    // deep route accepts a single alphabetic segment and forwards it as a
    // chapter body render with pageNumber=1 — the renderer will 404 downstream
    // when the chapter does not exist, but the ROUTE-level decision is covered.
    await RankGuideDeepPage({
      params: mkParams({ locale: 'en', rank: '5kyu', rest: ['diagonal'] }),
    } as never);
    expect(renderSpy).toHaveBeenCalledWith({
      kind: 'chapter-body',
      locale: 'en',
      slug: '5kyu',
      chapterSlug: 'diagonal',
      pageNumber: 1,
    });
  });
});
