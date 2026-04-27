import { SUPPORTED_LOCALES } from '@/config';

import type { Locale } from '@/app/[locale]/_lib/types';

type MetadataLoader<TMetadata> = () => Promise<{ metadata: TMetadata }>;
type ContentLoader = () => Promise<string>;

type MetadataRegistry<TMetadata> = Record<
  string,
  Partial<Record<Locale, MetadataLoader<TMetadata>>>
>;
type ContentRegistry = Record<string, Partial<Record<Locale, ContentLoader>>>;

type ContentManagerOptions<TMetadata> = {
  metadataRegistry: MetadataRegistry<TMetadata>;
  contentRegistry: ContentRegistry;
  sort?: (a: TMetadata, b: TMetadata) => number;
};

/**
 * Exhaustive variants used by `createExhaustiveContentManager`. The inner
 * type is `Record<Locale, ...>` (no `Partial`), so omitting any locale at
 * construction time is a TypeScript error. This is the structural guard
 * that makes the original "/pt-BR/manual is empty" bug unreproducible: a
 * future addition to `SUPPORTED_LOCALES` cannot land without also
 * registering loaders for every slug.
 */
type ExhaustiveMetadataRegistry<TMetadata> = Record<
  string,
  Record<Locale, MetadataLoader<TMetadata>>
>;
type ExhaustiveContentRegistry = Record<string, Record<Locale, ContentLoader>>;

type ExhaustiveContentManagerOptions<TMetadata> = {
  metadataRegistry: ExhaustiveMetadataRegistry<TMetadata>;
  contentRegistry: ExhaustiveContentRegistry;
  sort?: (a: TMetadata, b: TMetadata) => number;
};

type ContentManagerResult<TMetadata> = {
  getAvailableSlugs: () => string[];
  getArticle: (
    slug: string,
    locale: Locale
  ) => Promise<{ metadata: TMetadata; content: string } | null>;
  getAllArticles: (locale: Locale) => Promise<TMetadata[]>;
  /**
   * Return the list of locales for which a given slug has translations
   * registered (i.e. both a metadata loader and a content loader exist).
   *
   * Used to feed `availableLocales` into `generateCanonicalMetadata` /
   * `generateAlternates` so that partially-translated pages only emit
   * hreflang and sitemap `<alternate>` entries for the locales that
   * actually have content. Returns an empty array for unknown slugs.
   */
  getAvailableLocales: (slug: string) => Locale[];
};

export function createContentManager<TMetadata>(
  options: ContentManagerOptions<TMetadata>
): ContentManagerResult<TMetadata> {
  const { metadataRegistry, contentRegistry, sort } = options;

  const getAvailableSlugs = (): string[] => {
    return Object.keys(metadataRegistry);
  };

  const getArticle = async (
    slug: string,
    locale: Locale
  ): Promise<{ metadata: TMetadata; content: string } | null> => {
    const metadataLoader = metadataRegistry[slug]?.[locale];
    const contentLoader = contentRegistry[slug]?.[locale];

    if (!metadataLoader || !contentLoader) {
      return null;
    }

    try {
      const [metadataModule, content] = await Promise.all([metadataLoader(), contentLoader()]);

      return {
        metadata: metadataModule.metadata,
        content,
      };
    } catch (error) {
      console.error(`Error loading article ${slug}:`, error);
      return null;
    }
  };

  const getAllArticles = async (locale: Locale): Promise<TMetadata[]> => {
    const slugs = getAvailableSlugs();
    const articles: TMetadata[] = [];

    for (const slug of slugs) {
      try {
        const metadataLoader = metadataRegistry[slug]?.[locale];
        if (metadataLoader) {
          const metadataModule = await metadataLoader();
          articles.push(metadataModule.metadata);
        }
      } catch (error) {
        console.error(`Error loading metadata for ${slug}:`, error);
      }
    }

    if (sort) {
      return articles.sort(sort);
    }
    return articles;
  };

  const getAvailableLocales = (slug: string): Locale[] => {
    const metadataEntry = metadataRegistry[slug];
    const contentEntry = contentRegistry[slug];
    if (!metadataEntry || !contentEntry) {
      return [];
    }
    // A locale counts as "available" only when both metadata and content
    // loaders exist. This mirrors the guard in `getArticle`.
    return (Object.keys(metadataEntry) as Locale[]).filter(
      (locale) => metadataEntry[locale] && contentEntry[locale]
    );
  };

  return { getAvailableSlugs, getArticle, getAllArticles, getAvailableLocales };
}

/**
 * Exhaustive sibling of `createContentManager`. The registry types require
 * every supported locale for every slug, so a missing entry is a TypeScript
 * error at construction time rather than a silent "empty body" at runtime.
 *
 * Use this when partial translations are NOT acceptable (e.g. the manual,
 * which is short, pinned content). For sections that legitimately ship
 * partial translations (e.g. learn), use the permissive `createContentManager`
 * instead.
 *
 * Behavioral diff vs the permissive variant:
 * - Construction-time exhaustiveness check (the entire purpose of this fn).
 * - `getAvailableLocales` for a known slug always returns `SUPPORTED_LOCALES`,
 *   because the type system has already proved every locale is registered.
 *   Unknown slugs still return `[]` to match the permissive contract used by
 *   metadata/sitemap call sites.
 *
 * The runtime article-loading machinery (getArticle, getAllArticles, the
 * try/catch around dynamic imports) is shared with the permissive variant —
 * only the registry types and `getAvailableLocales` differ.
 */
export function createExhaustiveContentManager<TMetadata>(
  options: ExhaustiveContentManagerOptions<TMetadata>
): ContentManagerResult<TMetadata> {
  const base = createContentManager<TMetadata>(options);

  const getAvailableLocales = (slug: string): Locale[] => {
    if (!(slug in options.metadataRegistry)) {
      return [];
    }
    return [...SUPPORTED_LOCALES];
  };

  return {
    getAvailableSlugs: base.getAvailableSlugs,
    getArticle: base.getArticle,
    getAllArticles: base.getAllArticles,
    getAvailableLocales,
  };
}
