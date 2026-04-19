import { createContentManager } from '@/app/[locale]/(public)/_lib/content-manager';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { ManualArticle, ManualArticleMetadata } from './types';
import { MANUAL_ARTICLE_SLUGS } from './types';

// Per-article metadata loaders keyed by slug, then by locale.
//
// The inner type is `Partial<Record<Locale, ...>>` because a new locale may
// be added to `SUPPORTED_LOCALES` (e.g. `pt-BR`) before per-article
// translations exist. `createContentManager` treats missing (slug, locale)
// entries as "article not available in that locale": `getManualArticle`
// returns `null`, `getAllManualArticles` filters them out.
//
// TODO(Finding 4): the public `manual` pages currently do NOT plumb
// `availableLocales` through `generateCanonicalMetadata`, so hreflang is
// still emitted for all 4 supported locales regardless of which translations
// actually exist for a given article. Propagating "locales this article has"
// from this registry to the metadata builder is a separate PR.
const metadataRegistry: Record<
  string,
  Partial<Record<Locale, () => Promise<{ metadata: ManualArticleMetadata }>>>
> = {
  [MANUAL_ARTICLE_SLUGS.ABOUT_THIS_WEBSITE]: {
    en: () => import('@/app/[locale]/(public)/manual/_content/about-this-website/metadata.en'),
    ja: () => import('@/app/[locale]/(public)/manual/_content/about-this-website/metadata.ja'),
    es: () => import('@/app/[locale]/(public)/manual/_content/about-this-website/metadata.es'),
  },
  [MANUAL_ARTICLE_SLUGS.CHANGING_PIECE_APPEARANCE]: {
    en: () =>
      import('@/app/[locale]/(public)/manual/_content/changing-piece-appearance/metadata.en'),
    ja: () =>
      import('@/app/[locale]/(public)/manual/_content/changing-piece-appearance/metadata.ja'),
    es: () =>
      import('@/app/[locale]/(public)/manual/_content/changing-piece-appearance/metadata.es'),
  },
  [MANUAL_ARTICLE_SLUGS.DATA_HANDLING_CAUTION]: {
    en: () => import('@/app/[locale]/(public)/manual/_content/data-handling-caution/metadata.en'),
    ja: () => import('@/app/[locale]/(public)/manual/_content/data-handling-caution/metadata.ja'),
    es: () => import('@/app/[locale]/(public)/manual/_content/data-handling-caution/metadata.es'),
  },
};

// Content registry: same shape and rationale as `metadataRegistry` above —
// `Partial<Record<Locale, ...>>` keyed first by slug, then by locale. The
// loaders normalize both `export default '...'` and `export const content`
// module shapes to a plain string. See the TSDoc on `metadataRegistry` for
// the Finding 4 TODO.
const contentRegistry: Record<string, Partial<Record<Locale, () => Promise<string>>>> = {
  [MANUAL_ARTICLE_SLUGS.ABOUT_THIS_WEBSITE]: {
    en: () =>
      import('@/app/[locale]/(public)/manual/_content/about-this-website/en').then((m) =>
        'default' in m ? m.default : (m as { content: string }).content
      ),
    ja: () =>
      import('@/app/[locale]/(public)/manual/_content/about-this-website/ja').then((m) =>
        'default' in m ? m.default : (m as { content: string }).content
      ),
    es: () =>
      import('@/app/[locale]/(public)/manual/_content/about-this-website/es').then((m) =>
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
    es: () =>
      import('@/app/[locale]/(public)/manual/_content/changing-piece-appearance/es').then((m) =>
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
    es: () =>
      import('@/app/[locale]/(public)/manual/_content/data-handling-caution/es').then((m) =>
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
