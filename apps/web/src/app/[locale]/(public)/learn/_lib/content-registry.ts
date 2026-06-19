import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * Static dynamic-import registries for the learn section, separated from the
 * query API in `./utils` so that the (large) per-article import maps don't
 * obscure the small data-access surface. Consumed only by the
 * `learnContentManager` in `./utils`.
 *
 * Per-article content loaders keyed by slug, then by locale.
 *
 * The inner type is `Partial<Record<Locale, ...>>` because a new locale may be
 * added to `SUPPORTED_LOCALES` (e.g. `pt-BR`) before per-article translations
 * exist. Missing (slug, locale) pairs are handled at the data layer:
 * `createContentManager.getArticle` returns `null`, `getAllArticles` filters
 * out articles without a loader for the requested locale.
 *
 * The set of locales actually registered per slug is surfaced via
 * `getLearnArticleAvailableLocales(slug)` and plumbed into
 * `generateCanonicalMetadata` / `generateAlternates` so partially-translated
 * articles only emit hreflang and sitemap `<alternate>` entries for the
 * locales that have content.
 */
export const contentRegistry: Record<string, Partial<Record<Locale, () => Promise<string>>>> = {
  'algebraic-notation': {
    en: () => import('../_content/algebraic-notation/en').then((m) => m.default),
    ja: () => import('../_content/algebraic-notation/ja').then((m) => m.default),
    es: () => import('../_content/algebraic-notation/es').then((m) => m.default),
  },
  'anchor-squares': {
    en: () => import('../_content/anchor-squares/en').then((m) => m.default),
    ja: () => import('../_content/anchor-squares/ja').then((m) => m.default),
    es: () => import('../_content/anchor-squares/es').then((m) => m.default),
  },
  'bishop-movement': {
    en: () => import('../_content/bishop-movement/en').then((m) => m.default),
    ja: () => import('../_content/bishop-movement/ja').then((m) => m.default),
    es: () => import('../_content/bishop-movement/es').then((m) => m.default),
  },
  'board-symmetry': {
    en: () => import('../_content/board-symmetry/en').then((m) => m.default),
    ja: () => import('../_content/board-symmetry/ja').then((m) => m.default),
    es: () => import('../_content/board-symmetry/es').then((m) => m.default),
  },
  'coordinate-confusion': {
    en: () => import('../_content/coordinate-confusion/en').then((m) => m.default),
    ja: () => import('../_content/coordinate-confusion/ja').then((m) => m.default),
    es: () => import('../_content/coordinate-confusion/es').then((m) => m.default),
  },
  'de-groot-experiment': {
    en: () => import('../_content/de-groot-experiment/en').then((m) => m.default),
    ja: () => import('../_content/de-groot-experiment/ja').then((m) => m.default),
    es: () => import('../_content/de-groot-experiment/es').then((m) => m.default),
  },
  diagonals: {
    en: () => import('../_content/diagonals/en').then((m) => m.default),
    ja: () => import('../_content/diagonals/ja').then((m) => m.default),
    es: () => import('../_content/diagonals/es').then((m) => m.default),
  },
  'fen-notation': {
    en: () => import('../_content/fen-notation/en').then((m) => m.default),
    ja: () => import('../_content/fen-notation/ja').then((m) => m.default),
    es: () => import('../_content/fen-notation/es').then((m) => m.default),
  },
  'king-movement': {
    en: () => import('../_content/king-movement/en').then((m) => m.default),
    ja: () => import('../_content/king-movement/ja').then((m) => m.default),
    es: () => import('../_content/king-movement/es').then((m) => m.default),
  },
  'knight-movement': {
    en: () => import('../_content/knight-movement/en').then((m) => m.default),
    ja: () => import('../_content/knight-movement/ja').then((m) => m.default),
    es: () => import('../_content/knight-movement/es').then((m) => m.default),
  },
  'knight-tour': {
    en: () => import('../_content/knight-tour/en').then((m) => m.default),
    ja: () => import('../_content/knight-tour/ja').then((m) => m.default),
    es: () => import('../_content/knight-tour/es').then((m) => m.default),
  },
  'position-memory': {
    en: () => import('../_content/position-memory/en').then((m) => m.default),
    ja: () => import('../_content/position-memory/ja').then((m) => m.default),
    es: () => import('../_content/position-memory/es').then((m) => m.default),
  },
  'rook-movement': {
    en: () => import('../_content/rook-movement/en').then((m) => m.default),
    ja: () => import('../_content/rook-movement/ja').then((m) => m.default),
    es: () => import('../_content/rook-movement/es').then((m) => m.default),
  },
  'square-colors': {
    en: () => import('../_content/square-colors/en').then((m) => m.default),
    ja: () => import('../_content/square-colors/ja').then((m) => m.default),
    es: () => import('../_content/square-colors/es').then((m) => m.default),
  },
};

/** Static per-article metadata loaders keyed by slug, then by locale. */
export const metadataRegistry = {
  'algebraic-notation': {
    en: () => import('../_content/algebraic-notation/metadata.en'),
    ja: () => import('../_content/algebraic-notation/metadata.ja'),
    es: () => import('../_content/algebraic-notation/metadata.es'),
  },
  'anchor-squares': {
    en: () => import('../_content/anchor-squares/metadata.en'),
    ja: () => import('../_content/anchor-squares/metadata.ja'),
    es: () => import('../_content/anchor-squares/metadata.es'),
  },
  'bishop-movement': {
    en: () => import('../_content/bishop-movement/metadata.en'),
    ja: () => import('../_content/bishop-movement/metadata.ja'),
    es: () => import('../_content/bishop-movement/metadata.es'),
  },
  'board-symmetry': {
    en: () => import('../_content/board-symmetry/metadata.en'),
    ja: () => import('../_content/board-symmetry/metadata.ja'),
    es: () => import('../_content/board-symmetry/metadata.es'),
  },
  'coordinate-confusion': {
    en: () => import('../_content/coordinate-confusion/metadata.en'),
    ja: () => import('../_content/coordinate-confusion/metadata.ja'),
    es: () => import('../_content/coordinate-confusion/metadata.es'),
  },
  'de-groot-experiment': {
    en: () => import('../_content/de-groot-experiment/metadata.en'),
    ja: () => import('../_content/de-groot-experiment/metadata.ja'),
    es: () => import('../_content/de-groot-experiment/metadata.es'),
  },
  diagonals: {
    en: () => import('../_content/diagonals/metadata.en'),
    ja: () => import('../_content/diagonals/metadata.ja'),
    es: () => import('../_content/diagonals/metadata.es'),
  },
  'fen-notation': {
    en: () => import('../_content/fen-notation/metadata.en'),
    ja: () => import('../_content/fen-notation/metadata.ja'),
    es: () => import('../_content/fen-notation/metadata.es'),
  },
  'king-movement': {
    en: () => import('../_content/king-movement/metadata.en'),
    ja: () => import('../_content/king-movement/metadata.ja'),
    es: () => import('../_content/king-movement/metadata.es'),
  },
  'knight-movement': {
    en: () => import('../_content/knight-movement/metadata.en'),
    ja: () => import('../_content/knight-movement/metadata.ja'),
    es: () => import('../_content/knight-movement/metadata.es'),
  },
  'knight-tour': {
    en: () => import('../_content/knight-tour/metadata.en'),
    ja: () => import('../_content/knight-tour/metadata.ja'),
    es: () => import('../_content/knight-tour/metadata.es'),
  },
  'position-memory': {
    en: () => import('../_content/position-memory/metadata.en'),
    ja: () => import('../_content/position-memory/metadata.ja'),
    es: () => import('../_content/position-memory/metadata.es'),
  },
  'rook-movement': {
    en: () => import('../_content/rook-movement/metadata.en'),
    ja: () => import('../_content/rook-movement/metadata.ja'),
    es: () => import('../_content/rook-movement/metadata.es'),
  },
  'square-colors': {
    en: () => import('../_content/square-colors/metadata.en'),
    ja: () => import('../_content/square-colors/metadata.ja'),
    es: () => import('../_content/square-colors/metadata.es'),
  },
} as const;
