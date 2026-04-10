/**
 * Curated public surface of `@/lib/guides`.
 *
 * This barrel intentionally enumerates each export by name instead of using
 * `export *` so that:
 *
 * - Internal helpers (e.g. `CHAPTER_SLUG_PATTERN` in `parseGuideSegments.ts`,
 *   the `guideSuffix` helper in `buildGuidePath.ts`) stay private.
 * - Any new module-level symbol is opt-in: adding it here is a deliberate
 *   choice, so drive-by additions cannot leak into consumers.
 *
 * Consumers should import from `@/lib/guides` rather than the individual
 * files — the barrel gives one canonical import path for the whole module.
 */

// -- Guide data (i18n resolver) --
export { findChapter, getRankGuide } from './guideData';
export type { ChapteredGuide, FlatGuide, GuideChapter, GuidePage, RankGuide } from './guideData';

// -- URL segment parser --
export { parseGuideSegments } from './parseGuideSegments';
export type { ParsedGuideSegments } from './parseGuideSegments';

// -- Path / href builders --
export {
  buildChapterHref,
  buildFlatHref,
  buildGuideCanonicalPath,
  buildGuidePath,
  buildGuidePathRelative,
} from './buildGuidePath';
export type { GuidePathTarget } from './buildGuidePath';

// -- Route enumeration (sitemap + generateStaticParams) --
export { enumerateGuideRoutes, guideRouteToSegments } from './enumerateGuideRoutes';
export type { GuideRoutePath } from './enumerateGuideRoutes';
