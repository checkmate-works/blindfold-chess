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
