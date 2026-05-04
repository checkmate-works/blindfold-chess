import Link from 'next/link';

import { RANK_COLORS, type RankSlug } from '@/lib/db/data/ranks';

import { getBeltColorHex, isWhiteBelt } from '@/app/[locale]/(public)/ranks/_lib/helpers';

/**
 * Belt colors light enough to need dark text for contrast.
 * Other colors (orange/blue/green/brown/black) get white text.
 */
const LIGHT_BELT_COLORS = new Set(['white', 'yellow']);

type Props = {
  slug: RankSlug;
  label: string;
  locale: string;
};

/**
 * Belt-colored pill link to a rank detail page (`/<locale>/ranks/<slug>`).
 *
 * Used on the practice list page below each card to surface the kyu/dan
 * rank a given practice module contributes toward, while also providing
 * a navigation affordance to the rank detail page. The trailing arrow
 * lives inside the anchor text on purpose — it's part of the link
 * affordance, not a decorative sibling.
 */
export function RankBadge({ slug, label, locale }: Props) {
  const beltColor = getBeltColorHex(slug);
  const useDarkText = LIGHT_BELT_COLORS.has(RANK_COLORS[slug]);

  return (
    <Link
      href={`/${locale}/ranks/${slug}`}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold leading-none shadow-sm transition-opacity hover:opacity-80 ${
        useDarkText ? 'text-foreground' : 'text-white'
      } ${isWhiteBelt(beltColor) ? 'border border-border' : ''}`}
      style={{ backgroundColor: beltColor }}
    >
      {label} →
    </Link>
  );
}
