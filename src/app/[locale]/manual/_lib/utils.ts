import type { Locale } from '@/app/[locale]/_lib/types';

import type { ContentLoaders, LocaleLoaders, ManualArticle, ManualArticleMetadata } from './types';
import { MANUAL_ARTICLE_SLUGS } from './types';

// Article registry - maps slugs to their metadata modules
const articleRegistry: Record<string, LocaleLoaders> = {
  [MANUAL_ARTICLE_SLUGS.ABOUT_THIS_WEBSITE]: {
    en: () => import('@/app/[locale]/manual/_data/about-this-website/metadata.en'),
    ja: () => import('@/app/[locale]/manual/_data/about-this-website/metadata.ja'),
  },
  [MANUAL_ARTICLE_SLUGS.CHANGING_PIECE_APPEARANCE]: {
    en: () => import('@/app/[locale]/manual/_data/changing-piece-appearance/metadata.en'),
    ja: () => import('@/app/[locale]/manual/_data/changing-piece-appearance/metadata.ja'),
  },
  [MANUAL_ARTICLE_SLUGS.DATA_HANDLING_CAUTION]: {
    en: () => import('@/app/[locale]/manual/_data/data-handling-caution/metadata.en'),
    ja: () => import('@/app/[locale]/manual/_data/data-handling-caution/metadata.ja'),
  },
};

// Content registry - maps slugs to their content modules
const contentRegistry: Record<string, ContentLoaders> = {
  [MANUAL_ARTICLE_SLUGS.ABOUT_THIS_WEBSITE]: {
    en: () => import('@/app/[locale]/manual/_data/about-this-website/en'),
    ja: () => import('@/app/[locale]/manual/_data/about-this-website/ja'),
  },
  [MANUAL_ARTICLE_SLUGS.CHANGING_PIECE_APPEARANCE]: {
    en: () => import('@/app/[locale]/manual/_data/changing-piece-appearance/en'),
    ja: () => import('@/app/[locale]/manual/_data/changing-piece-appearance/ja'),
  },
  [MANUAL_ARTICLE_SLUGS.DATA_HANDLING_CAUTION]: {
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
