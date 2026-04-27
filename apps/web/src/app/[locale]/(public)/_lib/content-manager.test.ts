import { SUPPORTED_LOCALES } from '@/config';
import { describe, expect, it } from 'vitest';

import type { Locale } from '@/app/[locale]/_lib/types';

import { createContentManager, createExhaustiveContentManager } from './content-manager';

type FakeMeta = { slug: string; title: string };

const makeMetaLoader =
  (slug: string, locale: Locale) => async (): Promise<{ metadata: FakeMeta }> => ({
    metadata: { slug, title: `${slug}-${locale}` },
  });

const makeContentLoader = (slug: string, locale: Locale) => async (): Promise<string> =>
  `body-${slug}-${locale}`;

const fullRegistries = (slugs: string[]) => {
  const metadataRegistry: Record<
    string,
    Record<Locale, () => Promise<{ metadata: FakeMeta }>>
  > = {};
  const contentRegistry: Record<string, Record<Locale, () => Promise<string>>> = {};
  for (const slug of slugs) {
    const metaEntry = {} as Record<Locale, () => Promise<{ metadata: FakeMeta }>>;
    const contentEntry = {} as Record<Locale, () => Promise<string>>;
    for (const locale of SUPPORTED_LOCALES) {
      metaEntry[locale] = makeMetaLoader(slug, locale);
      contentEntry[locale] = makeContentLoader(slug, locale);
    }
    metadataRegistry[slug] = metaEntry;
    contentRegistry[slug] = contentEntry;
  }
  return { metadataRegistry, contentRegistry };
};

describe('createExhaustiveContentManager', () => {
  it('getAvailableLocales returns the full SUPPORTED_LOCALES set for every known slug', () => {
    const { metadataRegistry, contentRegistry } = fullRegistries(['alpha', 'beta']);
    const mgr = createExhaustiveContentManager<FakeMeta>({ metadataRegistry, contentRegistry });

    for (const slug of ['alpha', 'beta']) {
      expect(mgr.getAvailableLocales(slug).slice().sort()).toEqual([...SUPPORTED_LOCALES].sort());
    }
  });

  it('getAvailableLocales returns [] for an unknown slug', () => {
    const { metadataRegistry, contentRegistry } = fullRegistries(['alpha']);
    const mgr = createExhaustiveContentManager<FakeMeta>({ metadataRegistry, contentRegistry });

    expect(mgr.getAvailableLocales('unknown')).toEqual([]);
  });

  it('getAvailableSlugs reflects the metadataRegistry keys', () => {
    const { metadataRegistry, contentRegistry } = fullRegistries(['alpha', 'beta', 'gamma']);
    const mgr = createExhaustiveContentManager<FakeMeta>({ metadataRegistry, contentRegistry });

    expect(mgr.getAvailableSlugs().slice().sort()).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('getArticle resolves the registered loaders and returns metadata + content', async () => {
    const { metadataRegistry, contentRegistry } = fullRegistries(['alpha']);
    const mgr = createExhaustiveContentManager<FakeMeta>({ metadataRegistry, contentRegistry });

    const result = await mgr.getArticle('alpha', 'en');
    expect(result).not.toBeNull();
    expect(result?.metadata).toEqual({ slug: 'alpha', title: 'alpha-en' });
    expect(result?.content).toBe('body-alpha-en');
  });

  it('getArticle returns null for an unknown slug', async () => {
    const { metadataRegistry, contentRegistry } = fullRegistries(['alpha']);
    const mgr = createExhaustiveContentManager<FakeMeta>({ metadataRegistry, contentRegistry });

    expect(await mgr.getArticle('unknown', 'en')).toBeNull();
  });

  it('getAllArticles returns one entry per slug in the requested locale', async () => {
    const { metadataRegistry, contentRegistry } = fullRegistries(['alpha', 'beta']);
    const mgr = createExhaustiveContentManager<FakeMeta>({
      metadataRegistry,
      contentRegistry,
      sort: (a, b) => a.slug.localeCompare(b.slug),
    });

    const articles = await mgr.getAllArticles('ja');
    expect(articles).toEqual([
      { slug: 'alpha', title: 'alpha-ja' },
      { slug: 'beta', title: 'beta-ja' },
    ]);
  });

  it('getAvailableLocales is keyed off metadataRegistry, not contentRegistry', () => {
    // The exhaustive type system makes this scenario unreachable at compile
    // time, but pin the runtime contract anyway: the implementation uses
    // `slug in metadataRegistry` as its is-known-slug check. A future caller
    // (or a future variant that loosens types) should not silently surface a
    // content-only slug as "known".
    const { metadataRegistry } = fullRegistries(['alpha']);
    const contentRegistry = {
      ...fullRegistries(['alpha']).contentRegistry,
      'content-only': fullRegistries(['content-only']).contentRegistry['content-only']!,
    };
    const mgr = createExhaustiveContentManager<FakeMeta>({
      metadataRegistry,
      // Cast: deliberately violates the exhaustive type contract to pin
      // runtime behavior for the metadata-is-authoritative invariant.
      contentRegistry: contentRegistry as unknown as Record<
        string,
        Record<Locale, () => Promise<string>>
      >,
    });

    expect(mgr.getAvailableLocales('content-only')).toEqual([]);
    expect(mgr.getAvailableLocales('alpha').slice().sort()).toEqual([...SUPPORTED_LOCALES].sort());
  });
});

describe('createContentManager (permissive) — regression after exhaustive sibling added', () => {
  // The permissive variant is unchanged, but pin its public contract so a
  // future refactor that tries to share more code between the two siblings
  // cannot accidentally tighten its semantics.

  it('getAvailableLocales reports only locales with BOTH metadata and content loaders', () => {
    const metadataRegistry = {
      partial: {
        en: makeMetaLoader('partial', 'en'),
        ja: makeMetaLoader('partial', 'ja'),
      },
    };
    const contentRegistry = {
      partial: {
        en: makeContentLoader('partial', 'en'),
        // ja content missing — must be filtered out
      },
    };
    const mgr = createContentManager<FakeMeta>({ metadataRegistry, contentRegistry });

    expect(mgr.getAvailableLocales('partial')).toEqual(['en']);
  });

  it('getArticle returns null when only metadata is registered for a locale', async () => {
    const metadataRegistry = {
      partial: { en: makeMetaLoader('partial', 'en') },
    };
    const contentRegistry = {
      partial: {},
    };
    const mgr = createContentManager<FakeMeta>({ metadataRegistry, contentRegistry });

    expect(await mgr.getArticle('partial', 'en')).toBeNull();
  });
});
