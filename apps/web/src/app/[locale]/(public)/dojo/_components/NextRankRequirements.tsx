import Link from 'next/link';

import type { RequirementItem } from '@/app/[locale]/(public)/ranks/_components/RequirementsList';
import { isWhiteBelt } from '@/app/[locale]/(public)/ranks/_lib/helpers';

type NextRankRequirementsProps = {
  items: RequirementItem[];
  /**
   * Hex color of the next rank's belt. The bullet dot on each row uses this
   * color so the list visually ties to the rank it belongs to, matching the
   * look of `CurriculumToc`.
   */
  beltColor: string;
};

/**
 * Zenn-chapter-style flat list for the Dojo page's "Next rank requirements"
 * section. Plain vertical list — no outer card, no row dividers. Each row is
 * a single-line item with a belt-colored bullet on the left. The entire row
 * is a single `<Link>` to the matching practice page; rows without an `href`
 * render as static (non-link) entries.
 *
 * Matches the visual language of `CurriculumToc`.
 */
export function NextRankRequirements({ items, beltColor }: NextRankRequirementsProps) {
  const whiteBelt = isWhiteBelt(beltColor);

  return (
    <ol className="flex flex-col" data-testid="next-rank-requirements">
      {items.map((item, index) => {
        const baseRowClass = 'relative flex items-center gap-3 py-3 pl-3 pr-2';

        const beltDot = (
          <span
            className="inline-block size-2.5 shrink-0 rounded-full"
            style={{
              backgroundColor: beltColor,
              ...(whiteBelt ? { border: '1px solid #d4d4d4' } : {}),
            }}
            aria-hidden="true"
            data-testid="next-rank-belt-dot"
            data-belt-color={beltColor}
          />
        );

        const content = (
          <>
            {beltDot}
            <span className="flex-1 text-sm text-foreground">{item.label}</span>
          </>
        );

        if (item.href) {
          return (
            <li key={`${item.href}-${index}`}>
              <Link
                href={item.href}
                className={`${baseRowClass} transition-colors hover:bg-muted/30`}
              >
                {content}
              </Link>
            </li>
          );
        }

        return (
          <li key={`static-${index}`} className={`${baseRowClass} text-muted-foreground`}>
            {content}
          </li>
        );
      })}
    </ol>
  );
}
