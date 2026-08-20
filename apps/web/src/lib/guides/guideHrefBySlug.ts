import { ALL_RANK_SLUGS, type RankSlug } from '@/lib/db/data/ranks';
import { buildGuidePath } from '@/lib/guides/buildGuidePath';
import { getRankGuide } from '@/lib/guides/guideData';

/**
 * Per-rank guide hrefs for `CurriculumToc`, with `null` for ranks that have
 * no guide entry so the component renders them as disabled placeholders.
 *
 * Shared because `/dojo` and `/dojo/guides` both feed the same component: the
 * builder was written out twice, byte-identical down to the comment, so a
 * change to the disabled rule applied to one page would have made the two
 * disagree about which ranks are clickable — with no type or test to catch
 * the divergence.
 *
 * @param guidesPages The `guides` namespace's raw `pages` object.
 */
export function buildGuideHrefBySlug(
  locale: string,
  guidesPages: Record<string, unknown>
): Partial<Record<RankSlug, string | null>> {
  return Object.fromEntries(
    ALL_RANK_SLUGS.map((slug) => [
      slug,
      getRankGuide(guidesPages, slug) ? buildGuidePath(locale, slug, { kind: 'root' }) : null,
    ])
  );
}
