import Link from 'next/link';

import type {
  RequirementDivider,
  RequirementItem,
} from '@/app/[locale]/(public)/dojo/ranks/_components/RequirementsList';
import { isWhiteBelt } from '@/app/[locale]/(public)/dojo/ranks/_lib/belt-colors';
import { FOCUS_RING_CLASSES } from '@/app/[locale]/_lib/link-classes';

function isRequirementDivider(
  item: RequirementItem | RequirementDivider
): item is RequirementDivider {
  return 'kind' in item && item.kind === 'or';
}

type NextRankRequirementsProps = {
  items: (RequirementItem | RequirementDivider)[];
  /**
   * Hex color of the next rank's belt. The bullet dot on each row uses this
   * color so the list visually ties to the rank it belongs to.
   */
  beltColor: string;
};

/**
 * Flat row-stack list for the Dojo page's "Next rank requirements" section.
 * Each row is a single-line item with a belt-colored bullet on the left; the
 * entire row is a single `<Link>` to the matching practice page, and rows
 * without an `href` render as static (non-link) entries.
 *
 * Rows are separated by persistent horizontal borders (top border per row +
 * closing border-b on the outer `<ol>`) so the list reads as a tappable stack
 * on touch devices where hover affordance is unavailable.
 */
export function NextRankRequirements({ items, beltColor }: NextRankRequirementsProps) {
  const whiteBelt = isWhiteBelt(beltColor);

  return (
    <ol className="flex flex-col border-b border-border" data-testid="next-rank-requirements">
      {items.map((item, index) => {
        const baseRowClass =
          'relative flex items-center gap-3 border-t border-border py-3 pl-3 pr-2';

        if (isRequirementDivider(item)) {
          return (
            <li
              key={`or-${index}`}
              className={`${baseRowClass} justify-center text-xs text-muted-foreground`}
            >
              {item.label}
            </li>
          );
        }

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
                className={`${baseRowClass} transition-colors hover:bg-muted/30 ${FOCUS_RING_CLASSES}`}
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
