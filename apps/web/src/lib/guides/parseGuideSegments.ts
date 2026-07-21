/**
 * Parse the catch-all segments that follow `/dojo/guides/[rank]/`.
 *
 * The first segment decides between flat pagination and chaptered layout:
 * - Numeric first segment → flat rank, page 2..N.
 * - String first segment → chapter slug.
 * - If a chapter slug is followed by another segment, the second must be numeric.
 *
 * Returns `null` for malformed input (e.g. too many segments, non-numeric page).
 */
export type ParsedGuideSegments =
  | { kind: 'flat-page'; page: number }
  | { kind: 'chapter-root'; chapterSlug: string }
  | { kind: 'chapter-page'; chapterSlug: string; page: number };

// Chapter slugs MUST start with an ASCII letter.
// Leading digits are reserved for flat-page numbering (e.g. "/2" = page 2),
// so a chapter named "3-phase-model" would be misparsed as a numeric page.
// If you need digit-leading chapter names in the future, change this pattern
// AND update parseGuideSegments to disambiguate via a different rule.
const CHAPTER_SLUG_PATTERN = /^[a-z][a-z0-9-]*$/;

export function parseGuideSegments(segments: string[]): ParsedGuideSegments | null {
  if (segments.length === 0 || segments.length > 2) return null;

  const [first, second] = segments;

  // Numeric first segment → flat page
  if (/^\d+$/.test(first)) {
    if (segments.length !== 1) return null;
    const page = parseInt(first, 10);
    if (!Number.isFinite(page) || page < 1) return null;
    return { kind: 'flat-page', page };
  }

  // String first segment → chapter slug
  if (!CHAPTER_SLUG_PATTERN.test(first)) return null;

  if (segments.length === 1) {
    return { kind: 'chapter-root', chapterSlug: first };
  }

  if (!/^\d+$/.test(second)) return null;
  const page = parseInt(second, 10);
  if (!Number.isFinite(page) || page < 1) return null;
  return { kind: 'chapter-page', chapterSlug: first, page };
}
