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
};

export function RankBadge({ slug, label }: Props) {
  const beltColor = getBeltColorHex(slug);
  const useDarkText = LIGHT_BELT_COLORS.has(RANK_COLORS[slug]);

  return (
    <span
      className={`absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none shadow-sm ${
        useDarkText ? 'text-foreground' : 'text-white'
      } ${isWhiteBelt(beltColor) ? 'border border-border' : ''}`}
      style={{ backgroundColor: beltColor }}
    >
      {label}
    </span>
  );
}
