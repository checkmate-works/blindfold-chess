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
// The set of locales actually registered per slug is surfaced via
// `getManualArticleAvailableLocales(slug)` and plumbed into
// `generateCanonicalMetadata` / `generateAlternates` so partially-translated
// articles only emit hreflang and sitemap `<alternate>` entries for the
// locales that have content.
const metadataRegistry: Record<
  string,
  Partial<Record<Locale, () => Promise<{ metadata: ManualArticleMetadata }>>>
> = {
  [MANUAL_ARTICLE_SLUGS.ABOUT_THIS_WEBSITE]: {
    en: () => import('@/app/[locale]/(public)/manual/_content/about-this-website/metadata.en'),
    ja: () => import('@/app/[locale]/(public)/manual/_content/about-this-website/metadata.ja'),
    es: () => import('@/app/[locale]/(public)/manual/_content/about-this-website/metadata.es'),
    'pt-BR': () =>
      import('@/app/[locale]/(public)/manual/_content/about-this-website/metadata.pt-BR'),
  },
  [MANUAL_ARTICLE_SLUGS.CHANGING_PIECE_APPEARANCE]: {
    en: () =>
      import('@/app/[locale]/(public)/manual/_content/changing-piece-appearance/metadata.en'),
    ja: () =>
      import('@/app/[locale]/(public)/manual/_content/changing-piece-appearance/metadata.ja'),
    es: () =>
      import('@/app/[locale]/(public)/manual/_content/changing-piece-appearance/metadata.es'),
    'pt-BR': () =>
      import('@/app/[locale]/(public)/manual/_content/changing-piece-appearance/metadata.pt-BR'),
  },
  [MANUAL_ARTICLE_SLUGS.DATA_HANDLING_CAUTION]: {
    en: () => import('@/app/[locale]/(public)/manual/_content/data-handling-caution/metadata.en'),
    ja: () => import('@/app/[locale]/(public)/manual/_content/data-handling-caution/metadata.ja'),
    es: () => import('@/app/[locale]/(public)/manual/_content/data-handling-caution/metadata.es'),
    'pt-BR': () =>
      import('@/app/[locale]/(public)/manual/_content/data-handling-caution/metadata.pt-BR'),
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
    'pt-BR': () =>
      import('@/app/[locale]/(public)/manual/_content/about-this-website/pt-BR').then((m) =>
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
    'pt-BR': () =>
      import('@/app/[locale]/(public)/manual/_content/changing-piece-appearance/pt-BR').then((m) =>
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
    'pt-BR': () =>
      import('@/app/[locale]/(public)/manual/_content/data-handling-caution/pt-BR').then((m) =>
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

/**
 * Return the locales for which a given manual article has both metadata and
 * content loaders registered — i.e. the locales whose `/manual/<slug>` URL
 * should appear in hreflang alternates and the sitemap. Used by the article
 * page metadata and the sitemap builder.
 */
export const getManualArticleAvailableLocales = (slug: string): Locale[] => {
  return manualContentManager.getAvailableLocales(slug);
};
