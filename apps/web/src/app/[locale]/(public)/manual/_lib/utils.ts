import { createContentManager } from '@/app/[locale]/(public)/_lib/content-manager';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { ManualArticle, ManualArticleMetadata } from './types';
import { MANUAL_ARTICLE_SLUGS } from './types';

// Article registry - maps slugs to their metadata modules
const metadataRegistry: Record<
  string,
  Record<Locale, () => Promise<{ metadata: ManualArticleMetadata }>>
> = {
  [MANUAL_ARTICLE_SLUGS.ABOUT_THIS_WEBSITE]: {
    en: () => import('@/app/[locale]/(public)/manual/_content/about-this-website/metadata.en'),
    ja: () => import('@/app/[locale]/(public)/manual/_content/about-this-website/metadata.ja'),
  },
  [MANUAL_ARTICLE_SLUGS.CHANGING_PIECE_APPEARANCE]: {
    en: () =>
      import('@/app/[locale]/(public)/manual/_content/changing-piece-appearance/metadata.en'),
    ja: () =>
      import('@/app/[locale]/(public)/manual/_content/changing-piece-appearance/metadata.ja'),
  },
  [MANUAL_ARTICLE_SLUGS.DATA_HANDLING_CAUTION]: {
    en: () => import('@/app/[locale]/(public)/manual/_content/data-handling-caution/metadata.en'),
    ja: () => import('@/app/[locale]/(public)/manual/_content/data-handling-caution/metadata.ja'),
  },
};

// Content registry - maps slugs to their content loaders (normalized to return strings)
const contentRegistry: Record<string, Record<Locale, () => Promise<string>>> = {
  [MANUAL_ARTICLE_SLUGS.ABOUT_THIS_WEBSITE]: {
    en: () =>
      import('@/app/[locale]/(public)/manual/_content/about-this-website/en').then((m) =>
        'default' in m ? m.default : (m as { content: string }).content
      ),
    ja: () =>
      import('@/app/[locale]/(public)/manual/_content/about-this-website/ja').then((m) =>
        'default' in m ? m.default : (m as { content: string }).content
      ),
  },
  [MANUAL_ARTICLE_SLUGS.CHANGING_PIECE_APPEARANCE]: {
    en: () =>
      import('@/app/[locale]/(public)/manual/_content/changing-piece-appearance/en').then((m) =>
        'default' in m ? m.default : (m as { content: string }).content
      ),
    ja: () =>
      import('@/app/[locale]/(public)/manual/_content/changing-piece-appearance/ja').then((m) =>
        'default' in m ? m.default : (m as { content: string }).content
      ),
  },
  [MANUAL_ARTICLE_SLUGS.DATA_HANDLING_CAUTION]: {
    en: () =>
      import('@/app/[locale]/(public)/manual/_content/data-handling-caution/en').then((m) =>
        'default' in m ? m.default : (m as { content: string }).content
      ),
    ja: () =>
      import('@/app/[locale]/(public)/manual/_content/data-handling-caution/ja').then((m) =>
        'default' in m ? m.default : (m as { content: string }).content
      ),
  },
};

const manualContentManager = createContentManager<ManualArticleMetadata>({
  metadataRegistry,
  contentRegistry,
  sort: (a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    if (a.order !== undefined) return -1;
    if (b.order !== undefined) return 1;
    return 0;
  },
});

export const getManualArticle = async (
  slug: string,
  locale: Locale
): Promise<ManualArticle | null> => {
  const result = await manualContentManager.getArticle(slug, locale);
  if (!result) {
    return null;
  }
  return {
    metadata: {
      ...result.metadata,
      slug,
    },
    content: result.content,
  };
};

export const getAllManualArticles = async (locale: Locale): Promise<ManualArticleMetadata[]> => {
  return manualContentManager.getAllArticles(locale);
};
