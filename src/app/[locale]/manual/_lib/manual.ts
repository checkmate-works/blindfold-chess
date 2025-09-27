import type { Locale } from '../../_lib/types';

export interface ManualArticleMetadata {
  slug: string;
  title: string;
  excerpt: string;
  order?: number;
  tags: string[];
}

export interface ManualArticle {
  metadata: ManualArticleMetadata;
  content: string;
}

// Type for locale-specific loaders
type LocaleLoaders = {
  en: () => Promise<{ metadata: ManualArticleMetadata }>;
  ja: () => Promise<{ metadata: ManualArticleMetadata }>;
};

type ContentLoaders = {
  en: () => Promise<{ default: string } | { content: string }>;
  ja: () => Promise<{ default: string } | { content: string }>;
};

// Article registry - maps slugs to their metadata modules
const articleRegistry: Record<string, LocaleLoaders> = {
  'about-this-website': {
    en: () => import('@/app/[locale]/manual/_data/about-this-website/metadata.en'),
    ja: () => import('@/app/[locale]/manual/_data/about-this-website/metadata.ja'),
  },
  'changing-piece-appearance': {
    en: () => import('@/app/[locale]/manual/_data/changing-piece-appearance/metadata.en'),
    ja: () => import('@/app/[locale]/manual/_data/changing-piece-appearance/metadata.ja'),
  },
  'data-handling-caution': {
    en: () => import('@/app/[locale]/manual/_data/data-handling-caution/metadata.en'),
    ja: () => import('@/app/[locale]/manual/_data/data-handling-caution/metadata.ja'),
  },
};

// Content registry - maps slugs to their content modules
const contentRegistry: Record<string, ContentLoaders> = {
  'about-this-website': {
    en: () => import('@/app/[locale]/manual/_data/about-this-website/en'),
    ja: () => import('@/app/[locale]/manual/_data/about-this-website/ja'),
  },
  'changing-piece-appearance': {
    en: () => import('@/app/[locale]/manual/_data/changing-piece-appearance/en'),
    ja: () => import('@/app/[locale]/manual/_data/changing-piece-appearance/ja'),
  },
  'data-handling-caution': {
    en: () => import('@/app/[locale]/manual/_data/data-handling-caution/en'),
    ja: () => import('@/app/[locale]/manual/_data/data-handling-caution/ja'),
  },
};

export const getAvailableManualArticles = (): string[] => {
  return Object.keys(articleRegistry);
};

export const getManualArticle = async (
  slug: string,
  locale: Locale
): Promise<ManualArticle | null> => {
  const metadataLoader = articleRegistry[slug]?.[locale];
  const contentLoader = contentRegistry[slug]?.[locale];

  if (!metadataLoader || !contentLoader) {
    return null;
  }

  try {
    const [metadataModule, contentModule] = await Promise.all([metadataLoader(), contentLoader()]);

    const metadata = metadataModule.metadata;
    const content = 'default' in contentModule ? contentModule.default : contentModule.content;

    return {
      metadata: {
        ...metadata,
        slug,
      },
      content,
    };
  } catch (error) {
    console.error(`Failed to load manual article ${slug} for locale ${locale}:`, error);
    return null;
  }
};

export const getAllManualArticles = async (locale: Locale): Promise<ManualArticleMetadata[]> => {
  const slugs = getAvailableManualArticles();
  const articles = await Promise.all(
    slugs.map(async (slug) => {
      const article = await getManualArticle(slug, locale);
      return article?.metadata;
    })
  );

  return articles
    .filter((article): article is ManualArticleMetadata => article !== null)
    .sort((a, b) => {
      // Sort by order if available
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return 0;
    });
};

export type ManualArticleSlug = keyof typeof articleRegistry;
