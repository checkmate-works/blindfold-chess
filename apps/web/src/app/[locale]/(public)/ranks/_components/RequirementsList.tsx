import Link from 'next/link';

import { HiChevronRight, HiMiniStar } from 'react-icons/hi2';

import { Divider } from '@/app/[locale]/_components/Divider';

export type RequirementItem = {
  label: string;
  /** Small caption rendered under the label — e.g. a peek-count allowance. */
  note?: string;
} & ({ href: string } | { href?: never });

/**
 * Renders as a centered "--- {label} ---" row instead of a requirement card.
 * Used to join alternative requirements (e.g. "post A" OR "post B") without
 * implying they must both be satisfied.
 */
export type RequirementDivider = { kind: 'or'; label: string };

export type RequirementListEntry = string | RequirementItem | RequirementDivider;

function isRequirementDivider(item: RequirementListEntry): item is RequirementDivider {
  return typeof item === 'object' && 'kind' in item && item.kind === 'or';
}

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
        if (isRequirementDivider(item)) {
          return (
            <li key={i} className="flex items-center gap-3 py-1">
              <Divider className="flex-1" />
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <Divider className="flex-1" />
            </li>
          );
        }

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
