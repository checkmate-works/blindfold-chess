import Link from 'next/link';

import { RANK_COLORS, type RankSlug } from '@/lib/db/data/ranks';

import { getBeltColorHex, isWhiteBelt } from '@/app/[locale]/(public)/dojo/ranks/_lib/belt-colors';

/**
 * Belt colors light enough to need dark text for contrast.
 *
 * Only the white belt (mukyu) qualifies. Yellow (3kyu) intentionally uses
 * white text along with the other kyu/dan ranks: in dark mode the
 * `text-foreground` token resolves to a light tone, which collapses contrast
 * against a yellow background, and visually it kept 3kyu out of sync with
 * the other belts. White-on-yellow is the consistent choice that reads
 * acceptably under both color schemes.
 */
const LIGHT_BELT_COLORS = new Set(['white']);

type Props = {
  slug: RankSlug;
  label: string;
  locale: string;
};

/**
 * Belt-colored pill link to a rank detail page (`/<locale>/dojo/ranks/<slug>`).
 *
 * The one way a kyu/dan rank is shown anywhere: under each practice card, on
 * the games page, and as a member's held rank on their public profile. The
 * belt's colour has to be the pill's own fill rather than a swatch beside a
 * neutral pill — a small dark dot on a white pill reads as a white belt, which
 * is what 初段 looked like on the profile before this became shared.
 *
 * The trailing arrow lives inside the anchor text on purpose — it's part of
 * the link affordance, not a decorative sibling.
 */
export function BeltRankBadge({ slug, label, locale }: Props) {
  const beltColor = getBeltColorHex(slug);
  const useDarkText = LIGHT_BELT_COLORS.has(RANK_COLORS[slug]);

  return (
    <Link
      href={`/${locale}/dojo/ranks/${slug}`}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold leading-none shadow-sm transition-opacity hover:opacity-80 ${
        useDarkText ? 'text-foreground' : 'text-white'
      } ${isWhiteBelt(beltColor) ? 'border border-border' : ''}`}
      style={{ backgroundColor: beltColor }}
    >
      {label} →
    </Link>
  );
}
