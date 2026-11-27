import Link from 'next/link';

import { HiChevronRight, HiMiniStar } from 'react-icons/hi2';

export type RequirementItem = {
  label: string;
  /** Small caption rendered under the label — e.g. a peek-count allowance. */
  note?: string;
} & ({ href: string } | { href?: never });

/**
 * One row: a plain label, or a label with an optional link and caption.
 * Every row is a requirement in its own right — a rank's requirements are
 * all required, so the list has no "or" rows.
 */
export type RequirementListEntry = string | RequirementItem;

type RequirementsListProps = {
  items: RequirementListEntry[];
  className?: string;
  iconSize?: string;
  textSize?: string;
};

export function RequirementsList({
  items,
  className = 'space-y-2',
  iconSize = 'size-4',
  textSize = 'text-sm',
}: RequirementsListProps) {
  return (
    <ul className={className}>
      {items.map((item, i) => {
        const label = typeof item === 'string' ? item : item.label;
        const href = typeof item === 'string' ? undefined : item.href;
        const note = typeof item === 'string' ? undefined : item.note;

        return (
          <li key={i} className={`${textSize} text-foreground`}>
            {href ? (
              <Link
                href={href}
                className="block rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/20"
              >
                <div className="flex items-center gap-2">
                  <HiMiniStar className={`${iconSize} shrink-0 text-amber-500`} />
                  <span className="flex-1">{label}</span>
                  <HiChevronRight
                    aria-hidden="true"
                    className="size-5 shrink-0 text-foreground/40"
                  />
                </div>
                {note && <p className="mt-1 pl-6 text-xs text-muted-foreground">{note}</p>}
              </Link>
            ) : (
              <div className="flex items-start gap-2">
                <HiMiniStar className={`mt-0.5 ${iconSize} shrink-0 text-amber-500`} />
                <div>
                  <span>{label}</span>
                  {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
